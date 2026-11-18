using System;
using Rhino;
using Rhino.PlugIns;
using Rhino.UI;

namespace AurumCad;

[Guid("8C0A3C8D-2C0A-4D53-9B8E-1D5C9A7A4101")]
public sealed class AurumCadPlugin : PlugIn
{
    public static AurumCadPlugin? Instance { get; private set; }

    public AurumCadPlugin()
    {
        Instance = this;
    }

    protected override LoadReturnCode OnLoad(ref string errorMessage)
    {
        try
        {
            Panels.RegisterPanel(this, typeof(AurumCadPanel), "AURUM CAD", null);
            RhinoApp.WriteLine("AURUM CAD 0.1.0 cargado. Ejecuta el comando AurumCAD para abrir el panel.");
            return LoadReturnCode.Success;
        }
        catch (Exception exception)
        {
            errorMessage = exception.Message;
            return LoadReturnCode.ErrorShowDialog;
        }
    }
}