using System;
using Eto.Drawing;
using Eto.Forms;
using Rhino;
using Rhino.UI;

namespace AurumConect
{
    [System.Runtime.InteropServices.Guid("8D7C9A11-4A2F-46D3-A80B-2D0D9B9A7102")]
    public sealed class AurumConectPanel : Panel
    {
        private readonly Label _status;

        public AurumConectPanel()
        {
            var layout = new DynamicLayout
            {
                Padding = new Padding(16),
                Spacing = new Size(0, 10),
                BackgroundColor = Color.FromArgb(27, 30, 35)
            };

            layout.AddRow(new Label
            {
                Text = "AURUM CONECT",
                Font = new Font(SystemFont.Bold, 15),
                TextColor = Color.FromArgb(215, 181, 111)
            });
            layout.AddRow(new Label
            {
                Text = "MATRIXGOLD 3.1  ·  RHINO 7",
                TextColor = Color.FromArgb(165, 170, 178)
            });
            layout.AddRow(new Label
            {
                Text = "Envía una copia de la geometría seleccionada a AURUM Render.",
                TextColor = Color.FromArgb(205, 208, 213),
                Wrap = WrapMode.Word
            });

            var updateButton = new Button
            {
                Text = "ACTUALIZAR DISEÑO",
                Height = 42,
                BackgroundColor = Color.FromArgb(184, 143, 63),
                TextColor = Color.FromArgb(25, 25, 25)
            };
            updateButton.Click += (_, __) =>
                RhinoApp.RunScript("_AurumConectActualizar", false);
            layout.AddRow(updateButton);

            _status = new Label
            {
                Text = "Estado: esperando actualización",
                TextColor = Color.FromArgb(165, 170, 178),
                Wrap = WrapMode.Word
            };
            layout.AddRow(_status);
            layout.AddRow(new Label
            {
                Text = "La transferencia automática al visor web se habilitará en la siguiente fase. Esta versión prepara el .3dm temporal y abre AURUM Render.",
                TextColor = Color.FromArgb(145, 150, 158),
                Wrap = WrapMode.Word
            });

            Content = new Scrollable { Content = layout };
        }

        internal void SetStatus(string message)
        {
            if (_status == null) return;
            Application.Instance.AsyncInvoke(() => _status.Text = message);
        }
    }

    public sealed class AurumConectCommand : Rhino.Commands.Command
    {
        public override string EnglishName { get { return "AurumConect"; } }

        protected override Rhino.Commands.Result RunCommand(
            RhinoDoc doc,
            Rhino.Commands.RunMode mode)
        {
            Panels.OpenPanel(typeof(AurumConectPanel).GUID);
            return Rhino.Commands.Result.Success;
        }
    }
}
