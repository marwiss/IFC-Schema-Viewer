<!-- This file was generated with the assistance of an AI coding tool. -->
<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# IFC Schema Viewer

IFC schemas as a graph you can navigate, in the browser. A static page without a build step:

- **EXPRESS**: IFC2X3 TC1, IFC4 ADD2 TC1 and IFC4X3 ADD2, parsed from their `.exp` files in the browser.
- **IFC5**: the IFCX schemas published on [ifcx.dev](https://ifcx.dev/) (`ifc@v5a`, `prop@v5a`, `ifc-mat@v1.0.0`,
  `usd@v1`, `nlsfb@v1`), read as JSON, with their components grouped per namespace.
- **Comparison**: an EXPRESS entity beside IFC5, through the code of `bsi::ifc::class` and the components that have the
  names of its attributes.
- **Links**: every entity, type, attribute and property set links to its page in the standard.

You can also open your own `.exp` or `.ifcx` files; they are read in the browser and sent nowhere.

## Running it

The page must be served over http; it does not run from a file:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

and open <http://127.0.0.1:8000/>. Any static web server, including GitHub Pages, will do.

## Using it

The graph fills the middle of the page, with the details of the selected node beside it.

- **Click** a node for its details, **double-click** it to bring its neighbours into the graph, **Ctrl+click** (⌘+click)
  it to open its page in the standard.
- **Views**: *Neighbourhood* (the name and its relations, laid out with fCoSE), *Inheritance* (supertypes up to the root
  and every subtype below, laid out with ELK), *Whole tree* (every entity) and *IFC5 comparison*.
- **Relations** can be switched on and off: subtype, attribute, derive, inverse, select, underlying, value, uses (names
  that rules and derivations mention) and reverse (who refers to a name). Depth 2 brings in the neighbours' relations.
- The address names the schema, the name and the view (`#/IFC4/IfcWall/tree`), so a view can be linked to.

The notation borrows from EXPRESS-G (ISO 10303-11, annex D): entities are solid boxes and an abstract supertype is
marked `(ABS)`; defined, SELECT and ENUMERATION types are dashed; simple types have a double border; SUBTYPE OF is a
thick line ("1" marks ONEOF); attributes are thin lines with an open circle, dashed when OPTIONAL; derived and inverse
attributes are dotted, marked (DER) and (INV).

## What is shown of EXPRESS

| | |
|---|---|
| In the graph | entities, ABSTRACT, inheritance both ways, explicit attributes with their types, aggregates and bounds, OPTIONAL, INVERSE (with FOR), DERIVE (name and type), defined types, SELECT members, ENUMERATION values, redeclarations (`SELF\X.Y`) |
| As text in the panel | WHERE and UNIQUE rules, DERIVE expressions, `SUPERTYPE OF` expressions, STRING widths and FIXED, functions and global rules, the EXPRESS source of every declaration |
| Not at all | what rules mean (nothing is evaluated); property and quantity sets as graph nodes (they are not in the `.exp` files; their names, properties and links come from the documentation data); MVDs; EXPRESS that the IFC schemas do not use (USE and REFERENCE FROM, CONSTANT, PROCEDURE, SUBTYPE_CONSTRAINT, EXTENSIBLE and GENERIC types, ANDOR and AND), which the parser skips and counts |

## IFC5 and the comparison

IFC5 (`ifcx_alpha`) is a draft. Its schemas are flat: a key such as `bsi::ifc::prop::IsExternal` has a value with a data
type, and there is no inheritance between keys, so the graph shows the namespaces as nested boxes and a component as its
structure (Object members, Array elements, Enum options).

IFC5 data names the class of a path with `bsi::ifc::class`, `{code, uri}`, where the code is an IFC 4.3 class name and
the URI is its bSDD identifier. The schemas say nothing more about how IFC4 maps to IFC5, so the comparison matches by
name and says so: an attribute against components with the same last part (`Name` → `bsi::ifc::prop::Name`), the
entity against a component named like it (`IfcAlignmentHorizontalSegment` →
`bsi::ifc::alignmenthorizontalsegment`), its attributes against that component's members, enumerations against Enum
options, and an IFC5 property against the IFC 4.3 property sets that have it. With an IFC5 data file opened, it also
shows which components stand on the paths that carry a given class code.

## Sources

Nothing is fetched until you pick a schema. Every file comes from an address that names a commit or a versioned file
and is refused unless its SHA-256 matches; the addresses and sums are in [src/sources.js](src/sources.js). The schemas
are not copied into this repository.

| Files | Source |
|---|---|
| IFC2X3 TC1, IFC4 ADD2 TC1 | [buildingSMART/IFC4.x-development](https://github.com/buildingSMART/IFC4.x-development) at 119bf71, `reference_schemas/` |
| IFC4X3 ADD2 | [xBimTeam/XbimEssentials](https://github.com/xBimTeam/XbimEssentials) at fc40c51, `Schemas/IFC4X3_ADD2.exp` (the same bytes as ThatOpen/engine_web-ifc's copy) |
| IFC5 | [ifcx.dev](https://ifcx.dev/) |
| Links and descriptions | [IfcOpenShell](https://github.com/IfcOpenShell/IfcOpenShell) at 3e88479, `ifcopenshell/util/schema/ifc*_{entities,types,properties}.json` (LGPL-3.0-or-later) |

The IFC schemas and their documentation are © buildingSMART International Limited; IFC is a trademark of buildingSMART
International. This project is not affiliated with or endorsed by buildingSMART.

## Security

Text from the schema files is data. All of it reaches the page as text nodes or as labels drawn on the graph's canvas,
never as markup. The page's Content Security Policy allows only its own scripts and styles and connections to the two
hosts of the pinned files; links are made only to https addresses under the standards' known prefixes.

## Tests

```sh
node --test "tests/*.test.js"      # parser, model, IFCX, comparison, graph, links and the files themselves
node --test "tests/network/*.test.js"   # fetches the pinned files and checks sums, counts and links
```

## Third-party libraries

[Cytoscape.js](https://js.cytoscape.org/) with [fCoSE](https://github.com/iVis-at-Bilkent/cytoscape.js-fcose) and
[ELK](https://github.com/kieler/elkjs) (through cytoscape-elk) are kept unchanged in [vendor/](vendor/) with their
licences; [vendor/README.md](vendor/README.md) lists versions, sources and SHA-256, and `tools/fetch_vendor.py` fetches
them again from npm. The design tokens in `css/tokens.css` come from Dataspatium.

## The 2023 prototype

`ifc.py` and `docker-compose.yml` are the repository's first version, from when it was called Express2Neo4j: the
inheritance tree of an `.exp` file put into Neo4j with a regular expression (`python ifc.py -f IFC.exp -g
bolt://localhost:7687`, with `docker compose up -d` for the database). They are kept as they were.

## Licence

[AGPL-3.0-or-later](LICENSE). The libraries in `vendor/` keep their own licences; elkjs is used under
GPL-3.0-or-later, one of its two licences.
