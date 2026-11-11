using System;
using Rhino;
using Rhino.PlugIns;
using Rhino.UI;

namespace AurumConect
{
    [Guid("C8F4D8A1-5A2B-4D8E-9C31-7B7E2A4D9016")]
    public sealed class AurumConectPlugin : PlugIn
    {
        public static AurumConectPlugin Instance { get; private set; }

        public AurumConectPlugin()
        {
            Instance = this;
        }

        protected override LoadReturnCode OnLoad(ref string errorMessage)
        {
            try
            {
                Panels.RegisterPanel(this, typeof(AurumConectPanel), "AURUM CONECT", null);
                RhinoApp.WriteLine("AURUM CONECT 1.0 cargado. Ejecuta AurumConect para abrir el panel.");
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
