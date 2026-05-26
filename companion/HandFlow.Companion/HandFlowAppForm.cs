using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace HandFlow.Companion;

internal sealed class HandFlowAppForm : Form
{
    private readonly string appUrl;
    private readonly Action requestExit;
    private readonly WebView2 webView = new();

    public HandFlowAppForm(string appUrl, Action requestExit, Icon appIcon)
    {
        this.appUrl = appUrl;
        this.requestExit = requestExit;
        Text = "HandFlow";
        StartPosition = FormStartPosition.CenterScreen;
        MinimumSize = new Size(960, 640);
        Size = new Size(1280, 820);
        BackColor = Color.FromArgb(5, 7, 13);
        Icon = appIcon;

        webView.AllowExternalDrop = false;
        webView.BackColor = Color.FromArgb(5, 7, 13);
        webView.Dock = DockStyle.Fill;
        Controls.Add(webView);

        Shown += async (_, _) => await InitializeWebViewAsync();
    }

    private async Task InitializeWebViewAsync()
    {
        try
        {
            await webView.EnsureCoreWebView2Async();
            webView.CoreWebView2.Settings.AreBrowserAcceleratorKeysEnabled = true;
            webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
            webView.CoreWebView2.PermissionRequested += HandlePermissionRequested;
            webView.Source = new Uri(appUrl);
        }
        catch (Exception error)
        {
            ShowStartupError(error.Message);
        }
    }

    private static void HandlePermissionRequested(object? sender, CoreWebView2PermissionRequestedEventArgs eventArgs)
    {
        if (eventArgs.PermissionKind == CoreWebView2PermissionKind.Camera)
        {
            eventArgs.State = CoreWebView2PermissionState.Allow;
        }
    }

    private void ShowStartupError(string message)
    {
        Controls.Clear();
        Controls.Add(new Label
        {
            AutoSize = false,
            Dock = DockStyle.Fill,
            Font = new Font(FontFamily.GenericSansSerif, 12, FontStyle.Regular),
            ForeColor = Color.FromArgb(218, 246, 255),
            Padding = new Padding(28),
            Text = $"HandFlow cannot start the embedded browser.\n\n{message}\n\nInstall Microsoft Edge WebView2 Runtime, then reopen HandFlow.",
            TextAlign = ContentAlignment.MiddleCenter,
        });
    }

    protected override void OnFormClosing(FormClosingEventArgs e)
    {
        if (e.CloseReason == CloseReason.UserClosing)
        {
            e.Cancel = true;

            var result = MessageBox.Show(
                "Close HandFlow and stop background mouse control?",
                "Exit HandFlow",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Question);

            if (result == DialogResult.Yes)
            {
                BeginInvoke(requestExit);
            }

            return;
        }

        base.OnFormClosing(e);
    }
}
