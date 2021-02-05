# Danbooru Recontaminant

Bring some taint back into your search results.

## Features

Currently, post searches on Danbooru exclude deleted posts by default, unless
a `status:` term is specified. **Recontaminant** effects the opposite
behaviour, so deleted posts will be *included* by default.

This is achieved by automatically adding `status:any` to your search expression
whenever no other `status:` terms are present in the expression.
See the following examples:

Expression entered | Search performed
--- | ---
`` | `status:any`
`solo` | `solo status:any`
`rating:q` | `rating:q status:any`
`status:pending` | `status:pending`
`-status:deleted` | `-status:deleted status:any`

Note that the `status:` metatag does not count towards the limit on number of
tags in a search expression.

Recontaminant provides a partial workaround for
[issue #4512](https://github.com/danbooru/danbooru/issues/4512).
Note however that this technique is not able to affect the
*PostPreviewComponent*'s behaviour — thumbnail lists such as those on
user profiles or wiki pages may still exclude deleted posts.

## Installation

### Compatibility

The following browsers have been tested:

- Chrome version 87

- Firefox version 56

### Firefox

- Select the desired `danbooru-recontaminant-{VERSION}-an+fx.xpi`
from https://github.com/bipface/danbooru-recontaminant/releases

### Chrome

- Download the codebase `danbooru-recontaminant-{VERSION}.zip`
from https://github.com/bipface/danbooru-recontaminant/releases
and extract it to a new directory.

- Go to `chrome://extensions`.

- Ensure the *Developer mode* switch is *on*.

- Select *Load unpacked*.

- Choose the directory containing the downloaded code.

## Known Issues

For the sake of simplicity, the tag-expression parser used here takes an
approach which is not entirely faithful to Danbooru's own parser.
With an expression such as `tag1:' status:pending tag2'`,
Recontaminant will interpret it as a single metatag
(qualifier: `tag1`, value: ` status:pending tag2`), so the `status:pending` term
won't be detected, whereas Danbooru will interpret it as three terms
(`tag1:'`, `status:pending`, `tag2'`).

## Running Tests

`node inspect -e 'require("./background.js").test()'`
