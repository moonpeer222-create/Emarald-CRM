export class CRMDataStore {
  static updateCaseStatus(caseId: string, status: string): any | null {
    const cases = [] as any[];
    const caseIndex = cases.findIndex(c => c.id === caseId);
    if (caseIndex === -1) return null;

    const now = new Date().toISOString();
    const stageNum = 1;
    cases[caseIndex].timeline.push({
      id: `TL-${cases[caseIndex].timeline.length + 1}`,
      date: now,
      title: `Status changed to ${getStageLabel(status)}`,
      description: `Case moved to stage ${stageNum}: ${getStageLabel(status)}`,
      type: "status",
      user: "Agent",
    });
    cases[caseIndex].updatedDate = now;

    this.saveCases(cases);
    return cases[caseIndex];
  }
}
function getStageLabel(s: string) { return s; }
