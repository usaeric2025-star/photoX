import { DiagnosticTask } from "./types.js";
import { excessTagsTask } from "./tasks/excessTags.js";
import { orphanedPhotosTask } from "./tasks/orphanedPhotos.js";
import { emptyGroupsTask } from "./tasks/emptyGroups.js";
import { groupCoverMismatchTask } from "./tasks/groupCoverMismatch.js";
import { ghostRecordsTask } from "./tasks/ghostRecords.js";
import { missingHashesTask } from "./tasks/missingHashes.js";
import { missingUrlsTask } from "./tasks/missingUrls.js";
import { nonStandardCodesTask } from "./tasks/nonStandardCodes.js";
import { missingSecretsTableTask } from "./tasks/missingSecretsTable.js";
import { duplicatePhotosTask } from "./tasks/duplicatePhotos.js";

export const diagnosticRegistry: DiagnosticTask[] = [
  excessTagsTask,
  orphanedPhotosTask,
  emptyGroupsTask,
  groupCoverMismatchTask,
  ghostRecordsTask,
  missingHashesTask,
  missingUrlsTask,
  nonStandardCodesTask,
  missingSecretsTableTask,
  duplicatePhotosTask,
];
