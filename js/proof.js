(function (global) {
  const MAX_NOTE_LENGTH = 240;
  const MAX_ARCHIVE_RECORDS = 200;

  function findQuest(state, questId) {
    if (!state || !state.quests || !Array.isArray(state.quests.active)) return null;
    return state.quests.active.find(quest => quest.id === questId) || null;
  }

  function normalizeNote(note) {
    return String(note || "").trim().slice(0, MAX_NOTE_LENGTH);
  }

  function ensureArchive(state) {
    if (!state.proofs || typeof state.proofs !== "object" || Array.isArray(state.proofs)) {
      state.proofs = { records: [] };
    }
    if (!Array.isArray(state.proofs.records)) state.proofs.records = [];
    return state.proofs.records;
  }

  function getQuestDateKey(quest) {
    const assigned = String(quest.dateAssigned || "");
    if (global.DateUtils && global.DateUtils.parseLocalDateKey(assigned)) return assigned;
    return global.DateUtils ? global.DateUtils.getLocalDateKey() : null;
  }

  function normalizeArchiveRecord(record) {
    if (!record || typeof record !== "object") return null;
    const note = normalizeNote(record.note);
    const questId = String(record.questId || "").trim();
    if (!note || !questId) return null;
    return {
      questId,
      questTitle: String(record.questTitle || "Completed quest"),
      attribute: record.attribute ? String(record.attribute) : null,
      difficulty: record.difficulty ? String(record.difficulty) : null,
      questType: record.questType ? String(record.questType) : null,
      dateKey: record.dateKey ? String(record.dateKey) : null,
      note,
      createdAt: record.createdAt || null,
      updatedAt: record.updatedAt || null
    };
  }

  function getQuestProof(quest) {
    if (!quest || !quest.proof || quest.proof.type !== "note") return null;
    const note = normalizeNote(quest.proof.note);
    if (!note) return null;
    return {
      type: "note",
      note,
      createdAt: quest.proof.createdAt || null,
      updatedAt: quest.proof.updatedAt || null
    };
  }

  function setQuestProof(state, questId, note) {
    const quest = findQuest(state, questId);
    if (!quest) return { saved: false, reason: "quest-not-found", proof: null };
    if (!quest.done) return { saved: false, reason: "quest-incomplete", proof: null };

    const normalizedNote = normalizeNote(note);
    if (!normalizedNote) return { saved: false, reason: "empty-note", proof: null };

    const existing = getQuestProof(quest);
    const now = new Date().toISOString();
    quest.proof = {
      type: "note",
      note: normalizedNote,
      createdAt: existing && existing.createdAt ? existing.createdAt : now,
      updatedAt: now
    };
    const proof = getQuestProof(quest);
    const records = ensureArchive(state);
    const record = {
      questId: quest.id,
      questTitle: quest.title,
      attribute: quest.attribute || null,
      difficulty: quest.difficulty || null,
      questType: quest.questType || null,
      dateKey: getQuestDateKey(quest),
      note: proof.note,
      createdAt: proof.createdAt,
      updatedAt: proof.updatedAt
    };
    const existingIndex = records.findIndex(item => item && item.questId === quest.id);
    if (existingIndex >= 0) records[existingIndex] = record;
    else records.push(record);
    records.sort((a, b) => String(a.updatedAt || "").localeCompare(String(b.updatedAt || "")));
    if (records.length > MAX_ARCHIVE_RECORDS) records.splice(0, records.length - MAX_ARCHIVE_RECORDS);
    return { saved: true, reason: null, proof, record: normalizeArchiveRecord(record) };
  }

  function removeQuestProof(state, questId) {
    const quest = findQuest(state, questId);
    const records = ensureArchive(state);
    const archived = records.some(record => record && record.questId === questId);
    if (!quest && !archived) return { removed: false, reason: "quest-not-found" };
    if (!getQuestProof(quest) && !archived) return { removed: false, reason: "proof-not-found" };
    if (quest) delete quest.proof;
    state.proofs.records = records.filter(record => !record || record.questId !== questId);
    return { removed: true, reason: null };
  }

  function updateArchiveRecord(state, questId, note) {
    const records = ensureArchive(state);
    const recordIndex = records.findIndex(record => record && record.questId === questId);
    if (recordIndex < 0) return { saved: false, reason: "proof-not-found", record: null };

    const normalizedNote = normalizeNote(note);
    if (!normalizedNote) return { saved: false, reason: "empty-note", record: null };

    const now = new Date().toISOString();
    const updatedRecord = {
      ...records[recordIndex],
      note: normalizedNote,
      updatedAt: now
    };
    records[recordIndex] = updatedRecord;

    const quest = findQuest(state, questId);
    if (quest && getQuestProof(quest)) {
      quest.proof.note = normalizedNote;
      quest.proof.updatedAt = now;
    }
    return { saved: true, reason: null, record: normalizeArchiveRecord(updatedRecord) };
  }

  function getArchive(state, limit) {
    if (!state || !state.proofs || !Array.isArray(state.proofs.records)) return [];
    const maxRecords = Number.isInteger(limit) && limit > 0 ? limit : MAX_ARCHIVE_RECORDS;
    return state.proofs.records
      .map(normalizeArchiveRecord)
      .filter(Boolean)
      .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
      .slice(0, maxRecords);
  }

  global.Proof = {
    MAX_NOTE_LENGTH,
    MAX_ARCHIVE_RECORDS,
    getQuestProof,
    getArchive,
    setQuestProof,
    updateArchiveRecord,
    removeQuestProof
  };
})(typeof window !== "undefined" ? window : globalThis);
