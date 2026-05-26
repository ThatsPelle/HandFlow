using System.Net;

namespace HandFlow.Companion;

internal sealed class StaticFileServer : IDisposable
{
    private readonly HttpListener listener = new();
    private readonly string rootDirectory;
    private readonly string url;

    public StaticFileServer(string rootDirectory, int port = 47631)
    {
        this.rootDirectory = rootDirectory;
        url = $"http://127.0.0.1:{port}/";
        listener.Prefixes.Add(url);
    }

    public string AppUrl => $"{url}?desktop=1";

    public async Task StartAsync(CancellationToken cancellationToken)
    {
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
            catch (HttpListenerException)
            {
                break;
            }

            _ = Task.Run(() => HandleContextAsync(context), cancellationToken);
        }
    }

    public void Dispose()
    {
        if (listener.IsListening)
        {
            listener.Close();
        }
    }

    private async Task HandleContextAsync(HttpListenerContext context)
    {
        try
        {
            if (!Directory.Exists(rootDirectory))
            {
                await WriteMissingBuildAsync(context);
                return;
            }

            var relativePath = Uri.UnescapeDataString(context.Request.Url?.AbsolutePath.TrimStart('/') ?? string.Empty);
            if (string.IsNullOrWhiteSpace(relativePath))
            {
                relativePath = "index.html";
            }

            var filePath = Path.GetFullPath(Path.Combine(rootDirectory, relativePath.Replace('/', Path.DirectorySeparatorChar)));
            if (!filePath.StartsWith(Path.GetFullPath(rootDirectory), StringComparison.OrdinalIgnoreCase))
            {
                context.Response.StatusCode = 403;
                context.Response.Close();
                return;
            }

            if (!File.Exists(filePath))
            {
                filePath = Path.Combine(rootDirectory, "index.html");
            }

            if (!File.Exists(filePath))
            {
                await WriteMissingBuildAsync(context);
                return;
            }

            context.Response.ContentType = GetContentType(Path.GetExtension(filePath));
            context.Response.Headers["Cache-Control"] = "no-store";
            await using var stream = File.OpenRead(filePath);
            context.Response.ContentLength64 = stream.Length;
            await stream.CopyToAsync(context.Response.OutputStream);
            context.Response.Close();
        }
        catch
        {
            if (context.Response.OutputStream.CanWrite)
            {
                context.Response.StatusCode = 500;
                context.Response.Close();
            }
        }
    }

    private static async Task WriteMissingBuildAsync(HttpListenerContext context)
    {
        context.Response.StatusCode = 503;
        context.Response.ContentType = "text/html; charset=utf-8";
        await using var writer = new StreamWriter(context.Response.OutputStream);
        await writer.WriteAsync("<!doctype html><title>HandFlow</title><body style=\"background:#05070d;color:#e5faff;font-family:Segoe UI,sans-serif;padding:32px\">HandFlow web build missing. Run npm run build before publishing.</body>");
        context.Response.Close();
    }

    private static string GetContentType(string extension) =>
        extension.ToLowerInvariant() switch
        {
            ".css" => "text/css; charset=utf-8",
            ".html" => "text/html; charset=utf-8",
            ".js" => "text/javascript; charset=utf-8",
            ".json" => "application/json; charset=utf-8",
            ".png" => "image/png",
            ".svg" => "image/svg+xml",
            ".wasm" => "application/wasm",
            ".webp" => "image/webp",
            _ => "application/octet-stream",
        };
}
