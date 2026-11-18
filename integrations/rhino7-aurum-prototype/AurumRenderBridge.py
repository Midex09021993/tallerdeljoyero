# -*- coding: utf-8 -*-
"""AURUM Render Bridge — Rhino 7 / IronPython 2.7 proof of concept.

This prototype exports selected geometry to a separate temporary .3dm file,
preserving the source document, then opens the authenticated AURUM Render page.
It does NOT upload files or auto-load them in the web renderer yet.
Run from Rhino 7's ScriptEditor (Python / IronPython).
"""
import os
import tempfile
import webbrowser

import Rhino
import rhinoscriptsyntax as rs
import scriptcontext as sc
from System import Guid

AURUM_RENDER_URL = "https://www.tallerdeljoyero.com/aurum-render"


def main():
    doc = sc.doc
    if doc is None:
        rs.MessageBox("No hay un documento de Rhino activo.", 0, "AURUM Render")
        return

    ids = rs.GetObjects(
        "Selecciona la geometría que deseas preparar para AURUM Render",
        preselect=True,
        select=True
    )
    if not ids:
        return

    export_doc = Rhino.FileIO.File3dm()
    exported = 0
    for object_id in ids:
        rhino_object = doc.Objects.FindId(Guid(str(object_id)))
        if rhino_object is None or rhino_object.IsDeleted:
            continue
        # Add a duplicate geometry and a duplicate of its attributes to a new file.
        geometry_copy = rhino_object.Geometry.Duplicate()
        attributes_copy = rhino_object.Attributes.Duplicate()
        if geometry_copy is not None:
            export_doc.Objects.Add(geometry_copy, attributes_copy)
            exported += 1

    if exported == 0:
        rs.MessageBox("No se encontró geometría válida para exportar.", 0, "AURUM Render")
        return

    temp_dir = os.path.join(tempfile.gettempdir(), "AURUM-Render-Bridge")
    if not os.path.isdir(temp_dir):
        os.makedirs(temp_dir)
    safe_name = os.path.splitext(os.path.basename(doc.Name or "joya"))[0]
    safe_name = "".join(c if c.isalnum() or c in "-_ " else "_" for c in safe_name).strip()
    if not safe_name:
        safe_name = "joya"
    output_path = os.path.join(temp_dir, safe_name + "-aurum-transfer.3dm")

    # File3dm.Write creates a separate file; the original Rhino document is untouched.
    success = export_doc.Write(output_path, 7)
    if not success or not os.path.isfile(output_path):
        rs.MessageBox("No se pudo crear la copia temporal .3dm.", 0, "AURUM Render")
        return

    webbrowser.open(AURUM_RENDER_URL)
    rs.MessageBox(
        "Copia temporal preparada con {0} objeto(s):\n\n{1}\n\n"
        "Se abrió AURUM Render en el navegador.\n"
        "Prototipo inicial: la carga automática todavía no está conectada; "
        "no se ha subido ningún archivo.".format(exported, output_path),
        0,
        "AURUM Render — Prototipo"
    )


if __name__ == "__main__":
    main()
