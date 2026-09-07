import { roleDetails } from "../weddingContent";

export function mapEntourageRow(row) {
  return {
    id: row.entourage_id,
    name: row.full_name,
    shortName: row.full_name
      .replace(/^Mr\. & Mrs\. |^Mrs\. |^Mr\. /, "")
      .split(/[ &]/)[0],
    role: row.role,
    responseStatus: row.response_status,
    personalMessage: row.personal_message,
    photoPath: row.photo_path,
    ...roleDetails[row.role],
  };
}

export function summarizeResponses(proposals) {
  const byStatus = (status) =>
    proposals.filter((item) => item.response === status);
  const accepted = byStatus("accepted");
  const declined = byStatus("declined");
  const awaiting = byStatus("pending");
  const people = (items) =>
    items.reduce((sum, item) => sum + Number(item.party_size || 1), 0);

  return {
    totalResponses: accepted.length + declined.length,
    acceptedPeople: people(accepted),
    declinedPeople: people(declined),
    awaitingPeople: people(awaiting),
  };
}

export function filterResponses(proposals, filter, search) {
  const needle = search.trim().toLowerCase();
  return proposals.filter((proposal) => {
    const matchesFilter =
      filter === "responded"
        ? proposal.response !== "pending"
        : proposal.response === filter;
    return (
      matchesFilter &&
      (!needle || proposal.person_name.toLowerCase().includes(needle))
    );
  });
}
