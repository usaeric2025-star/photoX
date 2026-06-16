import { DiagnosticTask } from "./types";
import { excessTagsTask } from "./tasks/excessTags";
import { orphanedPhotosTask } from "./tasks/orphanedPhotos";
import { emptyGroupsTask } from "./tasks/emptyGroups";
import { groupCoverMismatchTask } from "./tasks/groupCoverMismatch";
import { ghostRecordsTask } from "./tasks/ghostRecords";
import { missingHashesTask } from "./tasks/missingHashes";
import { missingUrlsTask } from "./tasks/missingUrls";
import { nonStandardCodesTask } from "./tasks/nonStandardCodes";

export const diagnosticRegistry: DiagnosticTask[] = [
  excessTagsTask,
  orphanedPhotosTask,
  emptyGroupsTask,
  groupCoverMismatchTask,
  ghostRecordsTask,
  missingHashesTask,
  missingUrlsTask,
  nonStandardCodesTask,
];
