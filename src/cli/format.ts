import type {
  AttachmentMetadata,
  DraftPreview,
  DraftResult,
  Label,
  MessageDetail,
  MessageSummary,
  SendResult,
  ThreadDetail,
} from '../gmail/types.js';

function formatList(values: string[]): string {
  return values.length > 0 ? values.join(', ') : '-';
}

function renderTable(headers: string[], rows: string[][]): string {
  if (rows.length === 0) {
    return '';
  }

  const widths = headers.map((header, index) => {
    return Math.max(header.length, ...rows.map((row) => (row[index] ?? '').length));
  });

  const renderRow = (row: string[]) => row.map((cell, index) => cell.padEnd(widths[index])).join('  ');

  return [
    renderRow(headers),
    widths.map((width) => '-'.repeat(width)).join('  '),
    ...rows.map((row) => renderRow(row)),
  ].join('\n');
}

function appendField(lines: string[], label: string, value: string | string[] | undefined): void {
  if (value === undefined) {
    return;
  }

  if (Array.isArray(value)) {
    lines.push(`${label}: ${formatList(value)}`);
    return;
  }

  lines.push(`${label}: ${value || '-'}`);
}

function formatAttachments(attachments: AttachmentMetadata[]): string[] {
  if (attachments.length === 0) {
    return ['Attachments: -'];
  }

  const rows = attachments.map((attachment) => [
    attachment.filename,
    attachment.mimeType,
    String(attachment.size),
    attachment.inline ? 'yes' : 'no',
  ]);

  return ['Attachments:', renderTable(['Filename', 'Type', 'Size', 'Inline'], rows)];
}

function formatDraftPreview(preview: DraftPreview): string[] {
  const lines: string[] = [];

  appendField(lines, 'To', preview.to);
  appendField(lines, 'Cc', preview.cc);
  appendField(lines, 'Bcc', preview.bcc);
  appendField(lines, 'Subject', preview.subject);
  appendField(lines, 'Thread ID', preview.threadId);
  appendField(lines, 'Reply-To Message ID', preview.replyToMessageId);
  lines.push('');
  lines.push('Body:');
  lines.push(preview.body);

  return lines;
}

export function formatLabelTable(labels: Label[]): string {
  if (labels.length === 0) {
    return 'No labels found.\n';
  }

  return `${renderTable(
    ['Name', 'ID', 'Type', 'Unread', 'Total'],
    labels.map((label) => [
      label.name,
      label.id,
      label.type,
      String(label.messagesUnread ?? 0),
      String(label.messagesTotal ?? 0),
    ])
  )}\n`;
}

export function formatMessageSummaryTable(messages: MessageSummary[]): string {
  if (messages.length === 0) {
    return 'No messages found.\n';
  }

  return `${renderTable(
    ['ID', 'Thread', 'From', 'Subject', 'Date'],
    messages.map((message) => [
      message.id,
      message.threadId,
      message.from ?? '-',
      message.subject ?? '-',
      message.date ?? '-',
    ])
  )}\n`;
}

export function formatMessageDetail(message: MessageDetail): string {
  const lines: string[] = [];

  appendField(lines, 'ID', message.id);
  appendField(lines, 'Thread ID', message.threadId);
  appendField(lines, 'History ID', message.historyId);
  appendField(lines, 'Labels', message.labelIds);
  appendField(lines, 'Subject', message.subject);
  appendField(lines, 'From', message.from);
  appendField(lines, 'To', message.to);
  appendField(lines, 'Cc', message.cc);
  appendField(lines, 'Bcc', message.bcc);
  appendField(lines, 'Date', message.date);
  appendField(lines, 'Internal Date', message.internalDate);
  appendField(lines, 'Snippet', message.snippet);
  lines.push('');
  lines.push('Body:');
  lines.push(message.textBody ?? '-');
  lines.push('');
  lines.push(...formatAttachments(message.attachments));

  return `${lines.join('\n')}\n`;
}

export function formatThreadDetail(thread: ThreadDetail): string {
  const lines = [
    `ID: ${thread.id}`,
    `History ID: ${thread.historyId ?? '-'}`,
    `Snippet: ${thread.snippet ?? '-'}`,
    `Message Count: ${thread.messageCount}`,
  ];

  for (const [index, message] of thread.messages.entries()) {
    lines.push('');
    lines.push(`Message ${index + 1}`);
    lines.push('=========');
    lines.push(formatMessageDetail(message).trimEnd());
  }

  return `${lines.join('\n')}\n`;
}

export function formatDraftResult(result: DraftResult): string {
  const lines = [
    result.dryRun ? 'Draft preview' : 'Draft created',
    `Dry run: ${result.dryRun ? 'yes' : 'no'}`,
  ];

  if (result.draftId) {
    lines.push(`Draft ID: ${result.draftId}`);
  }

  if (result.threadId) {
    lines.push(`Thread ID: ${result.threadId}`);
  }

  lines.push('');
  lines.push(...formatDraftPreview(result.preview));

  return `${lines.join('\n')}\n`;
}

export function formatSendResult(result: SendResult): string {
  const lines = [
    result.dryRun ? 'Send preview' : 'Draft sent',
    `Dry run: ${result.dryRun ? 'yes' : 'no'}`,
    `Draft ID: ${result.draftId}`,
  ];

  if (result.messageId) {
    lines.push(`Message ID: ${result.messageId}`);
  }

  lines.push('');
  lines.push(...formatDraftPreview({
    to: result.preview.to,
    cc: result.preview.cc,
    bcc: result.preview.bcc,
    subject: result.preview.subject,
    body: result.preview.body,
  }));

  return `${lines.join('\n')}\n`;
}