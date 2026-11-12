using System;
using System.IO;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using Rhino;

namespace AurumConect
{
    /// <summary>
    /// Ventana Chromium independiente vinculada al flujo de trabajo de Rhino 7.
    /// Rhino 7 usa IE en el WebView nativo de Eto; por eso no alojamos el visor
    /// moderno dentro de ese control. WebView2 mantiene compatibilidad con Three.js.
    /// </summary>
    internal sealed class AurumConectRenderWindow : Form
    {
        private static AurumConectRenderWindow _instance;
        private readonly WebView2 _browser;
        private readonly string _initialUrl;
        private readonly System.Windows.Forms.Timer _viewportSyncTimer;

        private AurumConectRenderWindow(string url)
        {
            _initialUrl = url;
            Text = "AURUM RENDER · AURUM CONECT";
            Width = 1280;
            Height = 820;
            MinimumSize = new System.Drawing.Size(900, 600);
            StartPosition = FormStartPosition.CenterScreen;
            ShowIcon = true;

            _browser = new WebView2 { Dock = DockStyle.Fill };
            Controls.Add(_browser);

            // WebView2 is hosted inside a native WinForms window owned by Rhino.
            // Explicitly synchronize its client bounds after maximize/restore:
            // some Rhino/Windows DPI transitions resize the Form before the
            // embedded Chromium viewport commits its final composition bounds.
            _viewportSyncTimer = new System.Windows.Forms.Timer { Interval = 120 };
            _viewportSyncTimer.Tick += (_, __) =>
            {
                _viewportSyncTimer.Stop();
                if (IsDisposed || _browser.IsDisposed) return;
                _browser.Bounds = ClientRectangle;
                _browser.Invalidate();
                if (_browser.CoreWebView2 != null)
                {
                    try
                    {
                        _browser.CoreWebView2.ExecuteScriptAsync(
                            "window.dispatchEvent(new Event('resize')); window.dispatchEvent(new Event('aurum-host-resize'));"
                        );
                    }
                    catch { /* The WebView may still be navigating or closing. */ }
                }
            };
            Resize += (_, __) => ScheduleViewportSync();
            ResizeEnd += (_, __) => ScheduleViewportSync();
            Activated += (_, __) => ScheduleViewportSync();
            FormClosed += (_, __) =>
            {
                _viewportSyncTimer.Stop();
                _viewportSyncTimer.Dispose();
                if (ReferenceEquals(_instance, this)) _instance = null;
            };
            Shown += (_, __) =>
            {
                ScheduleViewportSync();
                InitializeBrowser(this, EventArgs.Empty);
            };
        }

        internal static void Open(string url)
        {
            if (String.IsNullOrWhiteSpace(url)) return;

            try
            {
                if (_instance != null && !_instance.IsDisposed)
                {
                    if (_instance.InvokeRequired)
                    {
                        _instance.BeginInvoke(new Action(() => _instance.Navigate(url)));
                    }
                    else
                    {
                        _instance.Navigate(url);
                    }
                    _instance.WindowState = FormWindowState.Normal;
                    _instance.BringToFront();
                    _instance.Activate();
                    return;
                }

                _instance = new AurumConectRenderWindow(url);
                IntPtr rhinoHandle = RhinoApp.MainWindowHandle();
                if (rhinoHandle != IntPtr.Zero)
                    _instance.Show(new RhinoWindowOwner(rhinoHandle));
                else
                    _instance.Show();
            }
            catch (Exception exception)
            {
                RhinoApp.WriteLine("AURUM CONECT: no se pudo abrir la ventana integrada: {0}", exception.Message);
                AurumConectPanel.OpenUrl(url);
            }
        }

        private void ScheduleViewportSync()
        {
            if (IsDisposed || _viewportSyncTimer == null) return;
            _viewportSyncTimer.Stop();
            _viewportSyncTimer.Start();
        }

        private async void InitializeBrowser(object sender, EventArgs e)
        {
            try
            {
                string userData = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "AURUM-LAB", "AurumConect", "WebView2");
                Directory.CreateDirectory(userData);

                CoreWebView2Environment environment =
                    await CoreWebView2Environment.CreateAsync(null, userData);
                await _browser.EnsureCoreWebView2Async(environment);

                _browser.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;
                _browser.CoreWebView2.Settings.IsStatusBarEnabled = false;
                _browser.CoreWebView2.Settings.AreDevToolsEnabled = false;
                _browser.CoreWebView2.NewWindowRequested += (s, args) =>
                {
                    args.Handled = true;
                    AurumConectPanel.OpenUrl(args.Uri);
                };
                _browser.Source = new Uri(_initialUrl);
            }
            catch (Exception exception)
            {
                MessageBox.Show(
                    this,
                    "No se pudo iniciar Microsoft Edge WebView2. Comprueba que el Runtime de Microsoft Edge WebView2 esté instalado.\r\n\r\n" + exception.Message,
                    "AURUM CONECT · WebView2",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning);
                AurumConectPanel.OpenUrl(_initialUrl);
            }
        }

        private sealed class RhinoWindowOwner : IWin32Window
        {
            internal RhinoWindowOwner(IntPtr handle) { Handle = handle; }
            public IntPtr Handle { get; private set; }
        }

        private void Navigate(string url)
        {
            if (_browser.CoreWebView2 != null)
                _browser.CoreWebView2.Navigate(url);
            else
                _browser.Source = new Uri(url);
        }
    }
}
