export type DirectMessage = {
  id: string; sender_id: string; recipient_id: string; content: string; created_at: string;
};

export function mergeMessages(existing: DirectMessage[], incoming: DirectMessage[]) {
  const byId = new Map(existing.map(message => [message.id,message]));
  incoming.forEach(message => byId.set(message.id,message));
  return [...byId.values()].sort((a,b)=>a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}

export function belongsToConversation(message: DirectMessage, viewer: string, peer: string) {
  return (message.sender_id===viewer && message.recipient_id===peer) ||
    (message.sender_id===peer && message.recipient_id===viewer);
}
