# Third-party libraries

Each library is kept unchanged under its own licence, next to its licence file. The files are fetched from the
npm registry at a pinned version and checked against the tarball's SHA-512 by `tools/fetch_vendor.py`, which
also writes this file; do not edit the files by hand.

elkjs is offered under EPL-2.0 OR GPL-3.0-or-later and is used here under GPL-3.0-or-later, which combines with
this project's AGPL-3.0-or-later.

| Package | Version | Licence | File | SHA-256 |
|---|---|---|---|---|
| [cytoscape](https://js.cytoscape.org/) | 3.34.4 | MIT | `vendor/cytoscape/LICENSE` | `eb319c6e6f233607f71e8e2f450391751883cfc0eeb3ca7ef574c13d1d9c2203` |
| [cytoscape](https://js.cytoscape.org/) | 3.34.4 | MIT | `vendor/cytoscape/cytoscape.min.js` | `081591ab735b2b6a3b31a3c60f8f3a3e2fee8c92939e0c7820ad1208571b6cd8` |
| [layout-base](https://github.com/iVis-at-Bilkent/layout-base) | 2.0.1 | MIT | `vendor/layout-base/LICENSE` | `eabb762d8a95109a39c9be3247325529a5239a7aca327d909c3ccdc41f3a06bf` |
| [layout-base](https://github.com/iVis-at-Bilkent/layout-base) | 2.0.1 | MIT | `vendor/layout-base/layout-base.js` | `ec15ab5df9af3f20708f4faab994accf91cda71848cd5bb10a23432cc50b6745` |
| [cose-base](https://github.com/iVis-at-Bilkent/cose-base) | 2.2.0 | MIT | `vendor/cose-base/LICENSE` | `5fb3cf4a14c3c5af6e473a192df8bca10c77754e3a0c6492c79fb92a76a5478a` |
| [cose-base](https://github.com/iVis-at-Bilkent/cose-base) | 2.2.0 | MIT | `vendor/cose-base/cose-base.js` | `7cae9509bd36235a63a85e71c8d9fa2cd0bc1d0c1ecc5b5a737976f39d040ddf` |
| [cytoscape-fcose](https://github.com/iVis-at-Bilkent/cytoscape.js-fcose) | 2.2.0 | MIT | `vendor/cytoscape-fcose/LICENSE` | `2837634f403949215760fcdd2fa1ed0c64875d02099ecc8318c704b852f1421d` |
| [cytoscape-fcose](https://github.com/iVis-at-Bilkent/cytoscape.js-fcose) | 2.2.0 | MIT | `vendor/cytoscape-fcose/cytoscape-fcose.js` | `4b1cab218d74996aa59cd8473f9239cc6398b8c1774d84d7e59ad9a68959cb57` |
| [elkjs](https://github.com/kieler/elkjs) | 0.12.1 | EPL-2.0 OR GPL-3.0-or-later | `vendor/elkjs/LICENSE.md` | `637e81f4a1b6b4079535c499fca05e238cf7605c1ff5b76d60d7da7ce96700c9` |
| [elkjs](https://github.com/kieler/elkjs) | 0.12.1 | EPL-2.0 OR GPL-3.0-or-later | `vendor/elkjs/elk.bundled.js` | `b1032b7cfd2a57c54c6f0e8369d7665e19a579954f7cd20a6dae28f1912ea0d7` |
| [cytoscape-elk](https://github.com/cytoscape/cytoscape.js-elk) | 2.3.0 | MIT | `vendor/cytoscape-elk/LICENSE` | `0ce4ff4d3a334ae70cf389e0e9095b6ea6ef7110b27d2728a32bb5a7f84ed064` |
| [cytoscape-elk](https://github.com/cytoscape/cytoscape.js-elk) | 2.3.0 | MIT | `vendor/cytoscape-elk/cytoscape-elk.js` | `25acbb9dea9b0dc6fef0e79b697547ee56e579f0e1c22ae4353131e72c7e140a` |

Sources: `https://registry.npmjs.org/<package>/-/<package>-<version>.tgz`.
