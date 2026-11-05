using Rhino;
using Rhino.Commands;
using Rhino.DocObjects;
using Rhino.Input.Custom;
using AurumCad.Core;

namespace AurumCad.Commands;

public sealed class AurumRingEditCommand : Command
{
    public override string EnglishName => "AurumRingEdit";

    protected override Result RunCommand(RhinoDoc doc, RunMode mode)
    {
        var selection = new GetObject();
        selection.SetCommandPrompt("Selecciona un aro paramétrico creado por AURUM CAD");
        selection.GeometryFilter = ObjectType.Brep;
        selection.SubObjectSelect = false;
        selection.Get();

        if (selection.CommandResult() != Result.Success)
            return selection.CommandResult();

        var selectedObject = selection.Object(0).Object();
        if (selectedObject is null ||
            !RingGeometryBuilder.TryReadParameters(selectedObject.Attributes, out var parameters))
        {
            RhinoApp.WriteLine("El objeto seleccionado no contiene parámetros de AURUM CAD.");
            return Result.Failure;
        }

        if (!TryPromptNumber("Nuevo diámetro interior (mm)", parameters.InnerDiameterMm, out var innerDiameter) ||
            !TryPromptNumber("Nuevo ancho del aro (mm)", parameters.WidthMm, out var width) ||
            !TryPromptNumber("Nuevo espesor radial (mm)", parameters.RadialThicknessMm, out var thickness))
            return Result.Cancel;

        parameters.InnerDiameterMm = innerDiameter;
        parameters.WidthMm = width;
        parameters.RadialThicknessMm = thickness;

        if (!RingGeometryBuilder.TryBuild(parameters, doc.ModelUnitSystem, doc.ModelAbsoluteTolerance, out var rebuilt, out var error) ||
            rebuilt is null)
        {
            RhinoApp.WriteLine("AURUM CAD: {0}", error);
            return Result.Failure;
        }

        var attributes = selectedObject.Attributes.Duplicate();
        RingGeometryBuilder.WriteMetadata(attributes, parameters);

        if (!doc.Objects.Replace(selectedObject.Id, rebuilt) ||
            !doc.Objects.ModifyAttributes(selectedObject.Id, attributes, true))
        {
            RhinoApp.WriteLine("AURUM CAD no pudo actualizar el objeto seleccionado.");
            return Result.Failure;
        }

        doc.Views.Redraw();
        RhinoApp.WriteLine("AURUM CAD: parámetros actualizados y geometría reconstruida.");
        return Result.Success;
    }

    private static bool TryPromptNumber(string prompt, double defaultValue, out double value)
    {
        var getter = new Rhino.Input.Custom.GetNumber();
        getter.SetCommandPrompt(prompt);
        getter.SetDefaultNumber(defaultValue);
        getter.Get();
        value = getter.Number();
        return getter.CommandResult() == Result.Success;
    }
}