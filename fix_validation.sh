#!/bin/bash

# Replace "if (!check.success) throw new Error(check.issues[0].message);"
find api/ -type f -exec sed -i -e 's/if (!check.success) throw new Error(check.issues\[0\].message);/if (!check.success) throw errorFactory.validation(check.issues);/g' {} +

# Replace "if (!check.success) return errorResponse(c, check.issues[0].message, 400);"
find api/ -type f -exec sed -i -e 's/if (!check.success) return errorResponse(c, check.issues\[0\].message, 400);/if (!check.success) throw errorFactory.validation(check.issues);/g' {} +
