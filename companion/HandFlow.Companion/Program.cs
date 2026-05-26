using System.Net;
using System.Net.WebSockets;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using System.Windows.Forms;

namespace HandFlow.Companion;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        using var singleInstance = new Mutex(true, "HandFlow.Companion.SingleInstance", out var createdNew);
        if (!createdNew)
        {
            MessageBox.Show(
                "HandFlow is already running. Check the taskbar or system tray.",
                "HandFlow",
                MessageBoxButtons.OK,
                MessageBoxIcon.Information);
            return;
        }

        ApplicationConfiguration.Initialize();
        Application.Run(new HandFlowTrayContext());
    }
}

internal sealed class HandFlowTrayContext : ApplicationContext
{
    private readonly CancellationTokenSource cts = new();
    private readonly Icon appIcon;
    private readonly NotifyIcon notifyIcon;
    private readonly HandFlowAppForm appForm;
    private readonly PointerServer server;
    private readonly StaticFileServer staticFileServer;
    private readonly HotkeyWindow hotkeyWindow;
    private bool enabled = true;

    public HandFlowTrayContext()
    {
        appIcon = HandFlowIcon.Create();
        staticFileServer = new StaticFileServer(Path.Combine(AppContext.BaseDirectory, "web"));
        server = new PointerServer(() => enabled);
        hotkeyWindow = new HotkeyWindow(ToggleEnabled);
        appForm = new HandFlowAppForm(staticFileServer.AppUrl, ExitThread, appIcon);
        notifyIcon = new NotifyIcon
        {
            Icon = appIcon,
            Text = "HandFlow",
            Visible = true,
            ContextMenuStrip = BuildMenu(),
        };
        notifyIcon.DoubleClick += (_, _) => ShowApp();
        notifyIcon.ShowBalloonTip(
            2500,
            "HandFlow",
            "App and pointer bridge started. Ctrl+Alt+H toggles pause.",
            ToolTipIcon.Info);
        ShowApp();
        _ = staticFileServer.StartAsync(cts.Token);
        _ = server.StartAsync(cts.Token);
    }

    private ContextMenuStrip BuildMenu()
    {
        var menu = new ContextMenuStrip();
        var enabledItem = new ToolStripMenuItem("Enabled", null, (_, _) => ToggleEnabled())
        {
            Checked = enabled,
        };
        menu.Items.Add("Open HandFlow", null, (_, _) => ShowApp());
        menu.Items.Add(enabledItem);
        menu.Items.Add("Exit", null, (_, _) => ExitThread());
        return menu;
    }

    private void ToggleEnabled()
    {
        enabled = !enabled;
        PointerController.ReleaseLeftButton();
        notifyIcon.Text = enabled ? "HandFlow: enabled" : "HandFlow: paused";
        notifyIcon.ContextMenuStrip = BuildMenu();
        appForm.Text = enabled ? "HandFlow" : "HandFlow - paused";
    }

    private void ShowApp()
    {
        appForm.Show();
        appForm.WindowState = FormWindowState.Normal;
        appForm.Activate();
    }

    protected override void ExitThreadCore()
    {
        cts.Cancel();
        PointerController.ReleaseLeftButton();
        hotkeyWindow.Dispose();
        appForm.Dispose();
        staticFileServer.Dispose();
        notifyIcon.Visible = false;
        notifyIcon.Dispose();
        appIcon.Dispose();
        cts.Dispose();
        base.ExitThreadCore();
    }
}

internal sealed class PointerServer(Func<bool> isEnabled)
{
    private readonly HttpListener listener = new();

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        listener.Prefixes.Add("http://127.0.0.1:47630/handflow/");
        listener.Start();

        while (!cancellationToken.IsCancellationRequested)
        {
            HttpListenerContext context;
            try
            {
                context = await listener.GetContextAsync().WaitAsync(cancellationToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }

            _ = HandleContextAsync(context, cancellationToken);
        }

        listener.Close();
    }

    private async Task HandleContextAsync(HttpListenerContext context, CancellationToken cancellationToken)
    {
        if (!context.Request.IsWebSocketRequest)
        {
            context.Response.StatusCode = 400;
            context.Response.Close();
            return;
        }

        var webSocketContext = await context.AcceptWebSocketAsync(null);
        var socket = webSocketContext.WebSocket;
        var buffer = new byte[2048];

        while (socket.State == WebSocketState.Open && !cancellationToken.IsCancellationRequested)
        {
            var result = await socket.ReceiveAsync(buffer, cancellationToken);
            if (result.MessageType == WebSocketMessageType.Close)
            {
                break;
            }

            var json = Encoding.UTF8.GetString(buffer, 0, result.Count);
            var command = JsonSerializer.Deserialize<PointerCommand>(json, JsonOptions.Value);

            if (command is not null && isEnabled())
            {
                PointerController.Apply(command);
            }
        }

        PointerController.ReleaseLeftButton();
    }
}

internal sealed record PointerCommand(string Type, double X, double Y, bool Down);

internal static class JsonOptions
{
    public static readonly JsonSerializerOptions Value = new()
    {
        PropertyNameCaseInsensitive = true,
    };
}

internal static class PointerController
{
    private const uint MouseEventFMove = 0x0001;
    private const uint MouseEventFLeftDown = 0x0002;
    private const uint MouseEventFLeftUp = 0x0004;
    private const uint MouseEventFAbsolute = 0x8000;
    private const int InputMouse = 0;
    private static bool isDown;

    public static void Apply(PointerCommand command)
    {
        var x = ToAbsolute(command.X, NativeMethods.GetSystemMetrics(0));
        var y = ToAbsolute(command.Y, NativeMethods.GetSystemMetrics(1));

        if (command.Type is "move" or "down")
        {
            SendMouse(MouseEventFMove | MouseEventFAbsolute, x, y);
        }

        if (command.Type == "down" && !isDown)
        {
            SendMouse(MouseEventFLeftDown, 0, 0);
            isDown = true;
        }

        if (command.Type == "up")
        {
            ReleaseLeftButton();
        }
    }

    public static void ReleaseLeftButton()
    {
        if (!isDown)
        {
            return;
        }

        SendMouse(MouseEventFLeftUp, 0, 0);
        isDown = false;
    }

    private static int ToAbsolute(double normalized, int size)
    {
        var clamped = Math.Clamp(normalized, 0, 1);
        return (int)Math.Round(clamped * 65535.0 * Math.Max(1, size - 1) / Math.Max(1, size));
    }

    private static void SendMouse(uint flags, int x, int y)
    {
        var input = new Input
        {
            Type = InputMouse,
            MouseInput = new MouseInput
            {
                Dx = x,
                Dy = y,
                Flags = flags,
            },
        };

        NativeMethods.SendInput(1, [input], Marshal.SizeOf<Input>());
    }
}

internal sealed class HotkeyWindow : NativeWindow, IDisposable
{
    private const int HotkeyId = 47130;
    private const int ModAlt = 0x0001;
    private const int ModControl = 0x0002;
    private const int WmHotkey = 0x0312;
    private readonly Action callback;

    public HotkeyWindow(Action callback)
    {
        this.callback = callback;
        CreateHandle(new CreateParams());
        NativeMethods.RegisterHotKey(Handle, HotkeyId, ModControl | ModAlt, (int)Keys.H);
    }

    protected override void WndProc(ref Message m)
    {
        if (m.Msg == WmHotkey)
        {
            callback();
        }

        base.WndProc(ref m);
    }

    public void Dispose()
    {
        NativeMethods.UnregisterHotKey(Handle, HotkeyId);
        DestroyHandle();
    }
}

[StructLayout(LayoutKind.Sequential)]
internal struct Input
{
    public int Type;
    public MouseInput MouseInput;
}

[StructLayout(LayoutKind.Sequential)]
internal struct MouseInput
{
    public int Dx;
    public int Dy;
    public uint MouseData;
    public uint Flags;
    public uint Time;
    public IntPtr ExtraInfo;
}

internal static partial class NativeMethods
{
    [LibraryImport("user32.dll", SetLastError = true)]
    public static partial uint SendInput(uint inputCount, Input[] inputs, int size);

    [LibraryImport("user32.dll")]
    public static partial int GetSystemMetrics(int index);

    [LibraryImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static partial bool RegisterHotKey(IntPtr windowHandle, int id, int modifiers, int virtualKey);

    [LibraryImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static partial bool UnregisterHotKey(IntPtr windowHandle, int id);

    [LibraryImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static partial bool DestroyIcon(IntPtr iconHandle);
}
