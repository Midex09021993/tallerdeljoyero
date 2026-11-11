using System;
using System.IO;
using Rhino;
using Rhino.DocObjects;
using Rhino.FileIO;
using Rhino.Input;
using Rhino.Input.Custom;

namespace AurumConect
{
    public sealed class AurumConectActualizarCommand : Rhino.Commands.Command
    {
        public override string EnglishName { get { return "AurumConectActualizar"; } }

        protected override Rhino.Commands.Result RunCommand(
            RhinoDoc doc,
            Rhino.Commands.RunMode mode)
        {
            if (doc == null)
            {
                RhinoApp.WriteLine("AURUM CONECT: no hay un documento activo.");
                return Rhino.Commands.Result.Failure;
            }

            var getter = new GetObject();
            getter.SetCommandPrompt("Selecciona las piezas que deseas actualizar en AURUM Render");
            getter.GeometryFilter = ObjectType.AnyObject;
            getter.SubObjectSelect = false;
            getter.GroupSelect = true;
            getter.EnablePreSelect(true, true);
            getter.GetMultiple(1, 0);

            if (getter.CommandResult() != Rhino.Commands.Result.Success)
                return getter.CommandResult();

            var exportDoc = new File3dm();
            int exported = 0;
            for (int i = 0; i < getter.ObjectCount; i++)
            {
                var source = getter.Object(i).Object();
                if (source == null || source.IsDeleted || source.Geometry == null)
                    continue;

                var geometryCopy = source.Geometry.Duplicate();
                var attributesCopy = source.Attributes.Duplicate();
                if (geometryCopy == null) continue;

                exportDoc.Objects.Add(geometryCopy, attributesCopy);
                exported++;
            }

            if (exported == 0)
            {
                RhinoApp.WriteLine("AURUM CONECT: no se encontró geometría válida.");
                return Rhino.Commands.Result.Failure;
            }

            string tempDirectory = Path.Combine(
                Path.GetTempPath(), "AURUM-LAB", "AURUM-CONECT");
            Directory.CreateDirectory(tempDirectory);

            string documentName = Path.GetFileNameWithoutExtension(doc.Name);
            if (String.IsNullOrWhiteSpace(documentName))
                documentName = "diseno";
            foreach (char invalid in Path.GetInvalidFileNameChars())
                documentName = documentName.Replace(invalid, '_');

            string fileName = documentName + "-" +
                DateTime.Now.ToString("yyyyMMdd-HHmmss") + ".3dm";
            string outputPath = Path.Combine(tempDirectory, fileName);

            if (!exportDoc.Write(outputPath, 7) || !File.Exists(outputPath))
            {
                RhinoApp.WriteLine("AURUM CONECT: no se pudo generar el archivo temporal.");
                return Rhino.Commands.Result.Failure;
            }

            AurumConectPanel.OpenAurumLogin();

            RhinoApp.WriteLine(
                "AURUM CONECT: copia temporal preparada ({0} objetos): {1}",
                exported, outputPath);
            RhinoApp.WriteLine(
                "Inicia sesión en AURUM LAB para abrir Aurum Render. La transferencia directa del .3dm aún está pendiente.");
            return Rhino.Commands.Result.Success;
        }
    }
}
