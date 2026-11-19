using System;
using System.IO;
using System.Runtime.InteropServices;
using Rhino;
using Rhino.PlugIns;
using Rhino.UI;

namespace AurumConect
{
    [Guid("A8E1C7B4-6F32-4D91-9A52-8C3F1B7D6240")]
    public sealed class AurumConectPlugin : PlugIn
    {
        public static AurumConectPlugin Instance { get; private set; }
        private static IntPtr _webView2LoaderHandle = IntPtr.Zero;

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern IntPtr LoadLibrary(string fileName);

        public AurumConectPlugin()
        {
            Instance = this;
        }

        protected override LoadReturnCode OnLoad(ref string errorMessage)
        {
            try
            {
                string pluginDirectory = Path.GetDirectoryName(typeof(AurumConectPlugin).Assembly.Location);
                if (String.IsNullOrWhiteSpace(pluginDirectory))
                    throw new InvalidOperationException("No se pudo determinar la carpeta de AURUM CONECT 8.");

                string nativeLoader = Path.Combine(pluginDirectory, "WebView2Loader.dll");
                if (File.Exists(nativeLoader) && _webView2LoaderHandle == IntPtr.Zero)
                {
                    _webView2LoaderHandle = LoadLibrary(nativeLoader);
                    if (_webView2LoaderHandle == IntPtr.Zero)
                        throw new InvalidOperationException("No se pudo cargar WebView2Loader.dll. Error de Windows: " + Marshal.GetLastWin32Error());
                }

                Panels.RegisterPanel(this, typeof(AurumConectPanel), "AURUM CONECT 8", null);
                RhinoApp.WriteLine("AURUM CONECT 8 1.0 cargado. Ejecuta AurumConect para abrir el panel.");
                return LoadReturnCode.Success;
            }
            catch (Exception exception)
            {
                errorMessage = exception.Message;
                return LoadReturnCode.ErrorShowDialog;
            }
        }
    }
}
