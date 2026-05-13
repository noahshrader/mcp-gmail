import { describe, expect, it, vi } from 'vitest';

import { main } from '../index.js';
import { buildCli } from '../program.js';

function createOutputCapture() {
  const stdout: string[] = [];
  const stderr: string[] = [];

  return {
    stdout,
    stderr,
    writeStdout: (text: string) => stdout.push(text),
    writeStderr: (text: string) => stderr.push(text),
  };
}

describe('CLI', () => {
  it('lists labels', async () => {
    const capture = createOutputCapture();
    const listLabels = vi.fn().mockResolvedValue([
      {
        id: 'INBOX',
        name: 'Inbox',
        type: 'system',
        messagesUnread: 3,
        messagesTotal: 10,
      },
    ]);

    const program = buildCli({
      stdout: capture.writeStdout,
      stderr: capture.writeStderr,
      labelService: () => ({ listLabels }),
    });

    await program.parseAsync(['node', 'cli', 'labels', 'list']);

    expect(listLabels).toHaveBeenCalledOnce();
    expect(capture.stdout.join('')).toContain('Inbox');
    expect(capture.stdout.join('')).toContain('INBOX');
  });

  it('searches messages with parsed options', async () => {
    const capture = createOutputCapture();
    const searchMessages = vi.fn().mockResolvedValue([
      {
        id: 'message-1',
        threadId: 'thread-1',
        labelIds: ['INBOX'],
        from: 'sender@example.com',
        to: ['receiver@example.com'],
        cc: [],
        bcc: [],
        subject: 'Quarterly Update',
        date: 'Wed, 01 Jan 2025 00:00:00 +0000',
      },
    ]);

    const program = buildCli({
      stdout: capture.writeStdout,
      stderr: capture.writeStderr,
      messageService: () => ({
        searchMessages,
        getMessage: vi.fn(),
      }),
    });

    await program.parseAsync([
      'node',
      'cli',
      'messages',
      'search',
      'in:inbox',
      '--max-results',
      '5',
      '--page-token',
      'page-1',
    ]);

    expect(searchMessages).toHaveBeenCalledWith('in:inbox', { maxResults: 5, pageToken: 'page-1' });
    expect(capture.stdout.join('')).toContain('Quarterly Update');
  });

  it('reads a message with the body by default', async () => {
    const capture = createOutputCapture();
    const getMessage = vi.fn().mockResolvedValue({
      id: 'message-1',
      threadId: 'thread-1',
      labelIds: ['INBOX'],
      attachments: [{ filename: 'invoice.pdf', mimeType: 'application/pdf', size: 42, inline: false }],
      to: ['receiver@example.com'],
      cc: [],
      bcc: [],
      textBody: 'Body text',
      from: 'sender@example.com',
      subject: 'Hello',
      date: 'Wed, 01 Jan 2025 00:00:00 +0000',
    });

    const program = buildCli({
      stdout: capture.writeStdout,
      stderr: capture.writeStderr,
      messageService: () => ({
        searchMessages: vi.fn(),
        getMessage,
      }),
    });

    await program.parseAsync(['node', 'cli', 'messages', 'read', 'message-1']);

    expect(getMessage).toHaveBeenCalledWith('message-1', true);
    expect(capture.stdout.join('')).toContain('Body text');
    expect(capture.stdout.join('')).toContain('invoice.pdf');
  });

  it('keeps draft send in dry-run mode unless confirmed', async () => {
    const capture = createOutputCapture();
    const sendDraft = vi.fn().mockResolvedValue({
      draftId: 'draft-1',
      dryRun: true,
      preview: {
        draftId: 'draft-1',
        to: ['person@example.com'],
        cc: [],
        bcc: [],
        subject: 'Preview',
        body: 'Preview body',
      },
    });

    const program = buildCli({
      stdout: capture.writeStdout,
      stderr: capture.writeStderr,
      draftService: () => ({
        createDraft: vi.fn(),
        updateDraft: vi.fn(),
        sendDraft,
        createReplyDraft: vi.fn(),
      }),
    });

    await program.parseAsync(['node', 'cli', 'draft', 'send', 'draft-1']);

    expect(sendDraft).toHaveBeenCalledWith('draft-1', true);
    expect(capture.stdout.join('')).toContain('Send preview');
  });

  it('sends a draft when confirmed', async () => {
    const capture = createOutputCapture();
    const sendDraft = vi.fn().mockResolvedValue({
      draftId: 'draft-1',
      messageId: 'message-sent-1',
      dryRun: false,
      preview: {
        draftId: 'draft-1',
        to: ['person@example.com'],
        cc: [],
        bcc: [],
        subject: 'Hello',
        body: 'Draft body',
      },
    });

    const program = buildCli({
      stdout: capture.writeStdout,
      stderr: capture.writeStderr,
      draftService: () => ({
        createDraft: vi.fn(),
        updateDraft: vi.fn(),
        sendDraft,
        createReplyDraft: vi.fn(),
      }),
    });

    await program.parseAsync(['node', 'cli', 'draft', 'send', 'draft-1', '--confirm']);

    expect(sendDraft).toHaveBeenCalledWith('draft-1', false);
    expect(capture.stdout.join('')).toContain('Draft sent');
    expect(capture.stdout.join('')).toContain('message-sent-1');
  });

  it('keeps history as a stub for now', async () => {
    const capture = createOutputCapture();
    const program = buildCli({
      stdout: capture.writeStdout,
      stderr: capture.writeStderr,
    });

    await program.parseAsync(['node', 'cli', 'history', 'list']);

    expect(capture.stdout.join('')).toContain('Run history not yet implemented.');
  });

  it('reads a message without the body when --no-body is passed', async () => {
    const capture = createOutputCapture();
    const getMessage = vi.fn().mockResolvedValue({
      id: 'message-1',
      threadId: 'thread-1',
      labelIds: ['INBOX'],
      attachments: [],
      to: ['receiver@example.com'],
      cc: [],
      bcc: [],
      from: 'sender@example.com',
      subject: 'Hello',
      date: 'Wed, 01 Jan 2025 00:00:00 +0000',
    });

    const program = buildCli({
      stdout: capture.writeStdout,
      stderr: capture.writeStderr,
      messageService: () => ({
        searchMessages: vi.fn(),
        getMessage,
      }),
    });

    await program.parseAsync(['node', 'cli', 'messages', 'read', 'message-1', '--no-body']);

    expect(getMessage).toHaveBeenCalledWith('message-1', false);
  });

  it('reads a thread', async () => {
    const capture = createOutputCapture();
    const getThread = vi.fn().mockResolvedValue({
      id: 'thread-1',
      historyId: 'hist-1',
      snippet: 'Thread snippet',
      messageCount: 1,
      messages: [
        {
          id: 'message-1',
          threadId: 'thread-1',
          labelIds: ['INBOX'],
          attachments: [],
          to: ['receiver@example.com'],
          cc: [],
          bcc: [],
          from: 'sender@example.com',
          subject: 'Hello',
          date: 'Wed, 01 Jan 2025 00:00:00 +0000',
          textBody: 'Thread body',
        },
      ],
    });

    const program = buildCli({
      stdout: capture.writeStdout,
      stderr: capture.writeStderr,
      threadService: () => ({ getThread }),
    });

    await program.parseAsync(['node', 'cli', 'threads', 'read', 'thread-1']);

    expect(getThread).toHaveBeenCalledWith('thread-1');
    expect(capture.stdout.join('')).toContain('Thread snippet');
    expect(capture.stdout.join('')).toContain('Thread body');
  });

  it('creates a draft in dry-run mode by default', async () => {
    const capture = createOutputCapture();
    const createDraft = vi.fn().mockResolvedValue({
      dryRun: true,
      preview: {
        to: ['person@example.com'],
        cc: [],
        bcc: [],
        subject: 'Hello',
        body: 'Draft body',
      },
    });

    const program = buildCli({
      stdout: capture.writeStdout,
      stderr: capture.writeStderr,
      draftService: () => ({
        createDraft,
        updateDraft: vi.fn(),
        sendDraft: vi.fn(),
        createReplyDraft: vi.fn(),
      }),
    });

    await program.parseAsync([
      'node', 'cli', 'draft', 'create',
      '--to', 'person@example.com',
      '--subject', 'Hello',
      '--body', 'Draft body',
    ]);

    expect(createDraft).toHaveBeenCalledWith(
      { to: ['person@example.com'], subject: 'Hello', body: 'Draft body', cc: undefined, bcc: undefined },
      true
    );
    expect(capture.stdout.join('')).toContain('Draft preview');
  });

  it('propagates service errors through main() and sets exitCode 1', async () => {
    const originalExitCode = process.exitCode;
    const stderrLines: string[] = [];
    const writeSpy = vi.spyOn(process.stderr, 'write').mockImplementation((text: unknown) => {
      stderrLines.push(String(text));
      return true;
    });

    try {
      await main(
        ['node', 'cli', 'labels', 'list'],
        {
          stdout: () => {},
          stderr: () => {},
          labelService: () => ({
            listLabels: vi.fn().mockRejectedValue(new Error('API unavailable')),
          }),
        }
      );
    } finally {
      writeSpy.mockRestore();
    }

    expect(process.exitCode).toBe(1);
    expect(stderrLines.join('')).toContain('API unavailable');

    process.exitCode = originalExitCode;
  });
});