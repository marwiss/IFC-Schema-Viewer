// This file was generated with the assistance of an AI coding tool.
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * The pinned sources. Every file is fetched from an address that names a commit or a versioned file, and refused unless
 * its SHA-256 is the one below (.claude/plans/underlag/kallor.md has the background). Nothing here is fetched until the
 * user picks a schema.
 */

const BSI = "https://raw.githubusercontent.com/buildingSMART/IFC4.x-development/119bf71c8049cd0683df0109844605e975025db2/reference_schemas/";
const XBIM = "https://raw.githubusercontent.com/xBimTeam/XbimEssentials/fc40c5156ca53eadd248b73c18d00625b83f3a4f/Schemas/";
const IFCX = "https://ifcx.dev/@";
const IOS = "https://raw.githubusercontent.com/IfcOpenShell/IfcOpenShell/3e8847927738ac0d832b4b713822c4fa9402ca2a/src/ifcopenshell-python/ifcopenshell/util/schema/";

/** The schemas the page offers. `docs` names the documentation data (entities, types, properties) of an EXPRESS schema. */
export const SCHEMAS = [
  {
    id: "IFC2X3",
    label: "IFC2X3 TC1",
    format: "express",
    files: [
      {
        url: `${BSI}IFC2X3_TC1.exp`,
        sha256: "e18a1b2c3e29f5256904c83378ccad0850f52287a8d0122d149aba4a417fe5e5",
        origin: "buildingSMART/IFC4.x-development @ 119bf71, reference_schemas/IFC2X3_TC1.exp",
      },
    ],
    notice: "IFC2x Edition 3 Technical Corrigendum 1 © buildingSMART International Limited.",
    docs: {
      entities: { url: `${IOS}ifc2x3_entities.json`, sha256: "48d4fda95f576e9d45bb621906a024ecaa8fbf47a74fad6efa52a58bd1f6eb4e" },
      types: { url: `${IOS}ifc2x3_types.json`, sha256: "9a52b35a4e6c4def1ac010efa33d0ac8d2d59694bc91eaec6f8bdf524ac1c02c" },
      properties: { url: `${IOS}ifc2x3_properties.json`, sha256: "45ed1ea34898c999de8b80f622260152fd0c2c29a4d5b60d32ca5e9352a15b8f" },
      psets: { url: `${IOS}Pset_IFC2X3.ifc`, sha256: "61a8732fbc35c5e911d7750e2be0e93ce7724e7eee751e9a6bfd71ebce7ef407" },
    },
  },
  {
    id: "IFC4",
    label: "IFC4 ADD2 TC1",
    format: "express",
    files: [
      {
        url: `${BSI}IFC4_ADD2_TC1.exp`,
        sha256: "a2704ba20a1b3d0b7d9b61d6fd37d0baa3b4996ba3e90d968a1d2ca2819d1046",
        origin: "buildingSMART/IFC4.x-development @ 119bf71, reference_schemas/IFC4_ADD2_TC1.exp",
      },
    ],
    notice: "IFC4 Addendum 2 Technical Corrigendum 1 © buildingSMART International Limited.",
    docs: {
      entities: { url: `${IOS}ifc4_entities.json`, sha256: "7b0010287ab1dc1bf4ebe297869fef49d92bf0ebef91509cd56f0935b1ea0ca9" },
      types: { url: `${IOS}ifc4_types.json`, sha256: "34c22bdffa0dccbf23ce01715bfab6473c762ee1fba5de2d6269b0b6b68befb7" },
      properties: { url: `${IOS}ifc4_properties.json`, sha256: "95896b227bc8430c027f9195299bd565381a8ae382dbefd8e8f762baf3bcfb1d" },
      psets: { url: `${IOS}Pset_IFC4_ADD2.ifc`, sha256: "5224cb82bea85ad4168e4a972fe410d1e4a727b55ae2127afbf2f623c4372bb1" },
    },
  },
  {
    id: "IFC4X3",
    label: "IFC4X3 ADD2",
    format: "express",
    files: [
      {
        url: `${XBIM}IFC4X3_ADD2.exp`,
        sha256: "f67c8762b13a099c28082061e6f16b9ef1284ceec34069792afc702725675860",
        origin: "xBimTeam/XbimEssentials @ fc40c51, Schemas/IFC4X3_ADD2.exp (the same bytes as ThatOpen/engine_web-ifc @ dd0461b)",
      },
    ],
    notice: "IFC 4.3.2.0 (IFC4X3_ADD2) © buildingSMART International Limited, CC BY-ND 4.0.",
    docs: {
      entities: { url: `${IOS}ifc4x3_entities.json`, sha256: "b869b4866d37d562ac62b04a1ad863b3806b313de50f727501e746bf3ea119a3" },
      types: { url: `${IOS}ifc4x3_types.json`, sha256: "0c5e8abf5c170a0e8dd2ad8290750b36858138b386c5185bdfcb108e0774f152" },
      properties: { url: `${IOS}ifc4x3_properties.json`, sha256: "2898fa5367a28e57fa74f808af151d73031ca8475d7f36cfe9e9d7f26a158b44" },
      psets: { url: `${IOS}Pset_IFC4X3.ifc`, sha256: "41c5b181eabd56da0c298c9adebc9c6f3aeebabb41f1c916848681f798aa8455" },
    },
  },
  {
    id: "IFC5",
    label: "IFC5 (IFCX v5a)",
    format: "ifcx",
    files: [
      {
        url: `${IFCX}standards.buildingsmart.org/ifc/core/ifc@v5a.ifcx`,
        sha256: "7ada4aea92eefd97e1bc0e4f18bc280ec869cfe7a443250da8f0e4b429cf047a",
        origin: "ifcx.dev, ifc@v5a",
      },
      {
        url: `${IFCX}standards.buildingsmart.org/ifc/core/prop@v5a.ifcx`,
        sha256: "5bd444faf1b515b20f441b4293bdcc9874a888618017d3822d94b15a794d96c2",
        origin: "ifcx.dev, prop@v5a",
      },
      {
        url: `${IFCX}standards.buildingsmart.org/ifc/ifc-mat/ifc-mat@v1.0.0.ifcx`,
        sha256: "0bfecb9f32ce8f104cc10333c67ecef14307898d5dea054bbbdfa8569f85f430",
        origin: "ifcx.dev, ifc-mat@v1.0.0",
      },
      {
        url: `${IFCX}openusd.org/usd@v1.ifcx`,
        sha256: "ec9d50cd00e20c8b7fefd0eca1ca0246d2153c93739f6b4e62721f775e58b3cc",
        origin: "ifcx.dev, usd@v1",
      },
      {
        url: `${IFCX}nlsfb/nlsfb@v1.ifcx`,
        sha256: "22c3f74fa121296e5b28bf5e5282ea91fea956c29681992eb78f3a1d0b3899f2",
        origin: "ifcx.dev, nlsfb@v1",
      },
    ],
    notice: "IFC5 is a draft (ifcx_alpha); the schemas are published on ifcx.dev.",
    docs: null,
  },
];

export const schemaById = (id) => SCHEMAS.find((s) => s.id === id) ?? null;

/** The EXPRESS schema whose classes the IFC5 class codes name (their URIs point at IFC 4.3). */
export const CLASS_SCHEMA = "IFC4X3";

/** Upper limits for what the page reads. */
export const LIMITS = { expressBytes: 16 * 1024 * 1024, jsonBytes: 64 * 1024 * 1024, jsonDepth: 64 };
