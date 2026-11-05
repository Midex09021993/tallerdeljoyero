using System;
using System.Globalization;
using Rhino;
using Rhino.DocObjects;
using Rhino.Geometry;

namespace AurumCad.Core;

public static class RingGeometryBuilder
{
    public const string FeatureTypeKey = "AURUMCAD.FeatureType";
    public const string FeatureType = "RingBand";

    public static bool TryBuild(
        RingParameters parameters,
        UnitSystem modelUnits,
        double documentTolerance,
        out Brep? ring,
        out string error)
    {
        ring = null;
        error = parameters.Validate() ?? string.Empty;
        if (error.Length > 0)
            return false;

        var scale = RhinoMath.UnitScale(UnitSystem.Millimeters, modelUnits);
        if (double.IsNaN(scale) || double.IsInfinity(scale) || scale <= 0)
        {
            error = "No se pudo determinar la escala de unidades del documento Rhino.";
            return false;
        }

        var innerRadius = parameters.InnerDiameterMm * scale * 0.5;
        var outerRadius = innerRadius + parameters.RadialThicknessMm * scale;
        var width = parameters.WidthMm * scale;
        var tolerance = Math.Max(documentTolerance, RhinoMath.ZeroTolerance);
        var extension = Math.Max(tolerance * 2.0, 0.001 * scale);

        var outerPlane = new Plane(new Point3d(0, 0, -width * 0.5), Vector3d.ZAxis);
        var innerPlane = new Plane(new Point3d(0, 0, -width * 0.5 - extension), Vector3d.ZAxis);

        var outerCylinder = new Cylinder(new Circle(outerPlane, outerRadius), width);
        var innerCylinder = new Cylinder(new Circle(innerPlane, innerRadius), width + extension * 2.0);
        var outerBrep = outerCylinder.ToBrep(true, true);
        var innerBrep = innerCylinder.ToBrep(true, true);

        if (outerBrep is null || innerBrep is null)
        {
            error = "Rhino no pudo construir los sólidos base del aro.";
            return false;
        }

        var difference = Brep.CreateBooleanDifference(outerBrep, innerBrep, tolerance);
        if (difference is null || difference.Length != 1 || difference[0] is null || !difference[0].IsValid)
        {
            error = "La operación booleana no produjo un único sólido válido. Revisa las dimensiones y la tolerancia del documento.";
            return false;
        }

        ring = difference[0];
        return true;
    }

    public static void WriteMetadata(ObjectAttributes attributes, RingParameters parameters)
    {
        attributes.SetUserString(FeatureTypeKey, FeatureType);
        attributes.SetUserString("AURUMCAD.SchemaVersion", "1");
        attributes.SetUserString("AURUMCAD.InnerDiameterMm", Format(parameters.InnerDiameterMm));
        attributes.SetUserString("AURUMCAD.WidthMm", Format(parameters.WidthMm));
        attributes.SetUserString("AURUMCAD.RadialThicknessMm", Format(parameters.RadialThicknessMm));
    }

    public static bool TryReadParameters(ObjectAttributes attributes, out RingParameters parameters)
    {
        parameters = new RingParameters();
        if (!string.Equals(attributes.GetUserString(FeatureTypeKey), FeatureType, StringComparison.Ordinal))
            return false;

        if (!TryRead(attributes, "AURUMCAD.InnerDiameterMm", out var innerDiameter) ||
            !TryRead(attributes, "AURUMCAD.WidthMm", out var width) ||
            !TryRead(attributes, "AURUMCAD.RadialThicknessMm", out var thickness))
            return false;

        parameters.InnerDiameterMm = innerDiameter;
        parameters.WidthMm = width;
        parameters.RadialThicknessMm = thickness;
        return parameters.Validate() is null;
    }

    private static bool TryRead(ObjectAttributes attributes, string key, out double value)
    {
        var raw = attributes.GetUserString(key);
        return double.TryParse(raw, NumberStyles.Float, CultureInfo.InvariantCulture, out value);
    }

    private static string Format(double value)
    {
        return value.ToString("R", CultureInfo.InvariantCulture);
    }
}