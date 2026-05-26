using System.Drawing.Drawing2D;
using System.Runtime.InteropServices;

namespace HandFlow.Companion;

internal static class HandFlowIcon
{
    public static Icon Create()
    {
        using var bitmap = new Bitmap(64, 64);
        using var graphics = Graphics.FromImage(bitmap);
        graphics.SmoothingMode = SmoothingMode.AntiAlias;
        graphics.Clear(Color.Transparent);

        var bounds = new RectangleF(7, 7, 50, 50);

        using (var fill = new SolidBrush(Color.FromArgb(14, 26, 42)))
        using (var border = new Pen(Color.FromArgb(52, 211, 238), 2f))
        using (var glow = new Pen(Color.FromArgb(96, 52, 211, 238), 5f))
        using (var card = CreateRoundedRectangle(bounds, 9f))
        {
            graphics.DrawPath(glow, card);
            graphics.FillPath(fill, card);
            graphics.DrawPath(border, card);
        }

        using (var pulse = new Pen(Color.FromArgb(110, 238, 249, 255), 5f))
        using (var line = new Pen(Color.FromArgb(110, 238, 249, 255), 2.6f))
        {
            pulse.StartCap = LineCap.Round;
            pulse.EndCap = LineCap.Round;
            pulse.LineJoin = LineJoin.Round;
            line.StartCap = LineCap.Round;
            line.EndCap = LineCap.Round;
            line.LineJoin = LineJoin.Round;

            var points = new[]
            {
                new PointF(15f, 33f),
                new PointF(24f, 33f),
                new PointF(28f, 22f),
                new PointF(34f, 41f),
                new PointF(39f, 28f),
                new PointF(49f, 28f),
            };

            graphics.DrawLines(pulse, points);
            graphics.DrawLines(line, points);
        }

        var handle = bitmap.GetHicon();

        try
        {
            using var icon = Icon.FromHandle(handle);
            return (Icon)icon.Clone();
        }
        finally
        {
            NativeMethods.DestroyIcon(handle);
        }
    }

    private static GraphicsPath CreateRoundedRectangle(RectangleF bounds, float radius)
    {
        var diameter = radius * 2;
        var path = new GraphicsPath();

        path.AddArc(bounds.X, bounds.Y, diameter, diameter, 180, 90);
        path.AddArc(bounds.Right - diameter, bounds.Y, diameter, diameter, 270, 90);
        path.AddArc(bounds.Right - diameter, bounds.Bottom - diameter, diameter, diameter, 0, 90);
        path.AddArc(bounds.X, bounds.Bottom - diameter, diameter, diameter, 90, 90);
        path.CloseFigure();

        return path;
    }
}
