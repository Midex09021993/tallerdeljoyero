using System;
using Eto.Drawing;
using Eto.Forms;
using Rhino;
using Rhino.DocObjects;
using AurumCad.Core;
using DrawingColor = System.Drawing.Color;
using EtoColor = Eto.Drawing.Color;

namespace AurumCad;

[System.Runtime.InteropServices.Guid("2E6B89F1-3B37-4D51-9E7B-0E72A2F1B902")]
public sealed class AurumCadPanel : Panel
{
    private readonly NumericStepper _innerDiameter = CreateStepper(10, 30, 16.5, 0.1);
    private readonly NumericStepper _width = CreateStepper(1, 15, 4.0, 0.1);
    private readonly NumericStepper _thickness = CreateStepper(0.6, 5, 1.5, 0.1);

    public AurumCadPanel()
    {
        var layout = new DynamicLayout
        {
            Padding = new Padding(16),
            Spacing = new Size(0, 9),
            BackgroundColor = EtoColor.FromArgb(27, 30, 35)
        };

        layout.AddRow(new Label
        {
            Text = "AURUM CAD",
            TextColor = EtoColor.FromArgb(215, 181, 111)
        });
        layout.AddRow(new Label
        {
            Text = "JEWELRY DESIGN SYSTEM  ·  RHINO 8",
            TextColor = EtoColor.FromArgb(165, 170, 178)
        });
        layout.AddRow(new Label
        {
            Text = "RING STUDIO",
            TextColor = EtoColor.FromArgb(215, 181, 111)
        });

        layout.AddRow(new Label { Text = "Diámetro interior (mm)" }, _innerDiameter);
        layout.AddRow(new Label { Text = "Ancho del aro (mm)" }, _width);
        layout.AddRow(new Label { Text = "Espesor radial (mm)" }, _thickness);

        var createButton = new Button
        {
            Text = "CREAR ARO PARAMÉTRICO",
            BackgroundColor = EtoColor.FromArgb(184, 143, 63)
        };
        createButton.Click += (_, _) => CreateRing();
        layout.AddRow(createButton);

        var editButton = new Button { Text = "EDITAR ARO SELECCIONADO" };
        editButton.Click += (_, _) => RhinoApp.RunScript("_AurumRingEdit", false);
        layout.AddRow(editButton);

        layout.AddRow(new Label
        {
            Text = "Prototipo 0.1 · Aro cilíndrico con parámetros guardados en el documento.",
            TextColor = EtoColor.FromArgb(145, 150, 158)
        });

        Content = new Scrollable { Content = layout };
    }

    private static NumericStepper CreateStepper(double min, double max, double value, double increment)
    {
        var stepper = new NumericStepper
        {
            DecimalPlaces = 2,
            MinValue = min,
            MaxValue = max,
            Increment = increment,
            Value = value
        };
        return stepper;
    }

    private void CreateRing()
    {
        var doc = RhinoDoc.ActiveDoc;
        if (doc is null)
        {
            RhinoApp.WriteLine("AURUM CAD: no hay un documento Rhino activo.");
            return;
        }

        var parameters = new RingParameters
        {
            InnerDiameterMm = _innerDiameter.Value,
            WidthMm = _width.Value,
            RadialThicknessMm = _thickness.Value
        };

        if (!RingGeometryBuilder.TryBuild(parameters, doc.ModelUnitSystem, doc.ModelAbsoluteTolerance, out var ring, out var error) ||
            ring is null)
        {
            RhinoApp.WriteLine("AURUM CAD: {0}", error);
            return;
        }

        var attributes = new ObjectAttributes
        {
            Name = "AURUM CAD · Aro paramétrico",
            ObjectColor = DrawingColor.FromArgb(194, 158, 91),
            ColorSource = ObjectColorSource.ColorFromObject
        };
        RingGeometryBuilder.WriteMetadata(attributes, parameters);

        var objectId = doc.Objects.AddBrep(ring, attributes);
        if (objectId == Guid.Empty)
        {
            RhinoApp.WriteLine("AURUM CAD: Rhino no pudo añadir el aro al documento.");
            return;
        }

        doc.Views.Redraw();
        RhinoApp.WriteLine("AURUM CAD: aro creado. Usa AurumRingEdit para modificar sus parámetros.");
    }
}