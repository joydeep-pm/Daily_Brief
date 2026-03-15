import { Client } from '@notionhq/client';

export class NotionDelivery {
  private client: Client;
  private databaseId: string;

  constructor() {
    this.client = new Client({
      auth: process.env.NOTION_API_KEY
    });

    this.databaseId = process.env.NOTION_DATABASE_ID || '';

    if (!this.databaseId) {
      throw new Error('NOTION_DATABASE_ID not configured');
    }
  }

  async deliver(briefing: string, metadata?: { sourceCount?: number; itemCount?: number }): Promise<string> {
    try {
      const date = new Date().toISOString().split('T')[0];

      // Convert markdown to Notion blocks
      const blocks = this.markdownToNotionBlocks(briefing);

      // Create page in database with only required Name property
      // Additional properties (Date, Source Count, Item Count) can be added manually in Notion if needed
      const response = await this.client.pages.create({
        parent: {
          database_id: this.databaseId
        },
        properties: {
          Name: {
            title: [
              {
                text: {
                  content: `Daily Brief - ${date}`
                }
              }
            ]
          }
        },
        children: blocks
      });

      // Return URL - construct it from the page ID since url property may not exist
      const pageId = 'id' in response ? response.id : '';
      return `https://www.notion.so/${pageId.replace(/-/g, '')}`;
    } catch (error) {
      throw new Error(`Failed to deliver to Notion: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private markdownToNotionBlocks(markdown: string): any[] {
    const blocks: any[] = [];
    const lines = markdown.split('\n');

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      // Skip empty lines
      if (!line.trim()) {
        i++;
        continue;
      }

      // Heading 1
      if (line.startsWith('# ')) {
        blocks.push({
          object: 'block',
          type: 'heading_1',
          heading_1: {
            rich_text: [{ type: 'text', text: { content: line.substring(2) } }]
          }
        });
      }
      // Heading 2
      else if (line.startsWith('## ')) {
        blocks.push({
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ type: 'text', text: { content: line.substring(3) } }]
          }
        });
      }
      // Heading 3
      else if (line.startsWith('### ')) {
        blocks.push({
          object: 'block',
          type: 'heading_3',
          heading_3: {
            rich_text: [{ type: 'text', text: { content: line.substring(4) } }]
          }
        });
      }
      // Bullet list
      else if (line.startsWith('- ') || line.startsWith('* ')) {
        blocks.push({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: this.parseRichText(line.substring(2))
          }
        });
      }
      // Divider
      else if (line.trim() === '---') {
        blocks.push({
          object: 'block',
          type: 'divider',
          divider: {}
        });
      }
      // Regular paragraph
      else {
        blocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: this.parseRichText(line)
          }
        });
      }

      i++;
    }

    return blocks;
  }

  private parseRichText(text: string): any[] {
    const richText: any[] = [];

    // Simple bold parsing (**text**)
    const boldRegex = /\*\*(.+?)\*\*/g;
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before bold
      if (match.index > lastIndex) {
        richText.push({
          type: 'text',
          text: { content: text.substring(lastIndex, match.index) }
        });
      }

      // Add bold text
      richText.push({
        type: 'text',
        text: { content: match[1] },
        annotations: { bold: true }
      });

      lastIndex = boldRegex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      richText.push({
        type: 'text',
        text: { content: text.substring(lastIndex) }
      });
    }

    // If no rich text was parsed, return simple text
    if (richText.length === 0) {
      return [{ type: 'text', text: { content: text } }];
    }

    return richText;
  }
}
