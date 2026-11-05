# AURUM CAD — Rhino 8 Plugin

AURUM CAD is an independent jewelry-design plugin hosted inside Rhinoceros 8. It uses RhinoCommon for geometry and Eto.Forms for a dockable panel.

## Current prototype: 0.1.0

- Native RhinoCommon plugin (.rhp).
- Dockable panel registered as AURUM CAD.
- AurumCAD command opens the panel.
- Ring Studio creates a closed cylindrical ring band using Rhino Brep boolean difference.
- Ring dimensions are stored as object user strings in the .3dm document.
- AurumRingEdit reads those parameters and rebuilds the selected AURUM ring.
- Millimeter inputs are converted to the active Rhino document units.

## Requirements

- Rhinoceros 8.33 or compatible Rhino 8 update.
- .NET 8 runtime for Rhino's default .NET Core runtime (Rhino 8.20+).
- .NET Framework 4.8 target is also built for Rhino's Windows compatibility runtime.
- .NET 8 SDK to build the project.

## Build

From the repository root:

    dotnet restore integrations/rhino8-aurum-cad/AurumCad.csproj
    dotnet build integrations/rhino8-aurum-cad/AurumCad.csproj --configuration Release

The Rhino 8 .NET Core plugin output is under:

    integrations/rhino8-aurum-cad/bin/Release/net8.0/AurumCad.rhp

Keep the adjacent .deps.json and other generated runtime files together when testing the plugin.

## Load in Rhino

1. Build the project.
2. In Rhino 8, use PluginManager and install/load AurumCad.rhp, or drag the .rhp into Rhino.
3. Run AurumCAD to open the dockable panel.
4. Set the inner diameter, width and radial thickness, then choose CREAR ARO PARAMÉTRICO.
5. Select the generated ring and run AurumRingEdit to change its dimensions and rebuild it.

## Prototype boundaries

This is the first technical proof, not a production-ready jewelry CAD system. Ring Studio currently creates a simple cylindrical band; it does not yet provide comfort-fit profiles, shoulders, settings, prongs, gems, pavé, fillets or manufacturing validation. The saved parameters are a first feature-metadata layer, not yet a complete dependency graph or undoable parametric history.

AURUM Render files and the existing web viewer are intentionally not referenced or modified by this plugin. No MatrixGold files, code or activation components are used.

## Next engineering milestones

1. Add geometry tests and robust ring profiles (comfort fit, half-round, flat, knife edge).
2. Add a document-level feature registry and dependency graph.
3. Add Gem Studio and Setting Studio as independent feature builders.
4. Add Yak packaging and signed release artifacts after Rhino-side validation.
