using Rhino;
using Rhino.Commands;
using Rhino.UI;

namespace AurumCad.Commands;

public sealed class AurumCadCommand : Command
{
    public override string EnglishName => "AurumCAD";

    protected override Result RunCommand(RhinoDoc doc, RunMode mode)
    {
        Panels.OpenPanel(typeof(AurumCadPanel));
        RhinoApp.WriteLine("AURUM CAD: panel abierto.");
        return Result.Success;
    }
}