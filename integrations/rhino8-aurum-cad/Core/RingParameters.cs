namespace AurumCad.Core;

public sealed class RingParameters
{
    public double InnerDiameterMm { get; set; } = 16.5;
    public double WidthMm { get; set; } = 4.0;
    public double RadialThicknessMm { get; set; } = 1.5;

    public string? Validate()
    {
        if (!double.IsFinite(InnerDiameterMm) || InnerDiameterMm < 10.0 || InnerDiameterMm > 30.0)
            return "El diámetro interior debe estar entre 10 y 30 mm.";

        if (!double.IsFinite(WidthMm) || WidthMm < 1.0 || WidthMm > 15.0)
            return "El ancho del aro debe estar entre 1 y 15 mm.";

        if (!double.IsFinite(RadialThicknessMm) || RadialThicknessMm < 0.6 || RadialThicknessMm > 5.0)
            return "El espesor radial debe estar entre 0.6 y 5 mm.";

        return null;
    }

    public RingParameters Clone()
    {
        return new RingParameters
        {
            InnerDiameterMm = InnerDiameterMm,
            WidthMm = WidthMm,
            RadialThicknessMm = RadialThicknessMm
        };
    }
}