#!/bin/bash

# api/_handlers/groups.ts
sed -i -e '1i import { errorFactory } from "../_lib/error/factory.js";' api/_handlers/groups.ts
sed -i -e '1i import { errorFactory } from "../_lib/error/factory.js";' api/_handlers/tags.ts
sed -i -e '1i import { errorFactory } from "../_lib/error/factory.js";' api/_handlers/ai.ts
sed -i -e '1i import { errorFactory } from "../../_lib/error/factory.js";' api/_handlers/photos/detail.ts

