import dotenv from 'dotenv';
import { StateManager } from './state/database.js';
import { SourceManager } from './ingestion/source-manager.js';
import { LLMClient } from './synthesis/llm-client.js';
import { AnthropicProvider } from './synthesis/providers/anthropic.js';
import { OpenAIProvider } from './synthesis/providers/openai.js';
import { NotionDelivery } from './delivery/notion.js';
import { GmailDelivery } from './delivery/gmail.js';

// Load environment variables
dotenv.config();

async function main() {
  const startTime = Date.now();

  try {
    console.log('🚀 Daily Brief - Starting content aggregation...\n');

    // 1. Initialize state manager
    console.log('📊 Initializing state database...');
    const stateManager = new StateManager();

    const stats = stateManager.getStats();
    console.log(`   Database contains ${stats.totalItems} items from ${stats.sourceCount} sources`);

    // 2. Ingest content from all sources
    console.log('\n📡 Ingesting content from sources...');
    const sourceManager = new SourceManager(stateManager);
    const { items, errors } = await sourceManager.fetchAll();

    console.log(`\n✅ Ingestion complete:`);
    console.log(`   - New items: ${items.length}`);
    console.log(`   - Failed sources: ${errors.length}`);

    if (errors.length > 0) {
      console.warn('\n⚠️  Source errors:');
      errors.forEach(err => {
        console.warn(`   - ${err.sourceName}: ${err.error}`);
      });
    }

    // 3. Synthesize briefing with LLM
    console.log('\n🤖 Synthesizing briefing with AI...');
    const llmClient = new LLMClient(
      new AnthropicProvider(),
      process.env.OPENAI_API_KEY ? new OpenAIProvider() : undefined
    );

    let briefing = await llmClient.generateBriefing(items);

    // Append error section if any sources failed
    if (errors.length > 0) {
      briefing += '\n\n---\n## ⚠️ Source Errors\n\n';
      briefing += 'The following sources encountered errors during ingestion:\n\n';
      errors.forEach(err => {
        briefing += `- **${err.sourceName}** (${err.sourceType}): ${err.error}\n`;
      });
    }

    console.log('✅ Briefing generated');

    // 4. Deliver to Notion and Gmail (if not in dry-run mode)
    const forceDelivery = process.env.FORCE_DELIVERY === 'true';
    const shouldDeliver = forceDelivery || items.length > 0;

    if (shouldDeliver) {
      console.log('\n📬 Delivering briefing...');

      try {
        const [notionUrl, gmailMessageId] = await Promise.all([
          deliverToNotion(briefing, items.length, sourceManager.getSourcesCount()),
          deliverToGmail(briefing)
        ]);

        console.log('✅ Briefing delivered:');
        console.log(`   - Notion: ${notionUrl}`);
        console.log(`   - Gmail: Message ID ${gmailMessageId}`);
      } catch (deliveryError) {
        console.error('❌ Delivery failed:', deliveryError instanceof Error ? deliveryError.message : String(deliveryError));
        console.log('\n📄 Briefing content (for manual delivery):');
        console.log('---');
        console.log(briefing);
        console.log('---');
      }
    } else {
      console.log('\n⏭️  Skipping delivery (no new items and FORCE_DELIVERY not set)');
      console.log('\n📄 Generated briefing:');
      console.log('---');
      console.log(briefing);
      console.log('---');
    }

    // 5. Cleanup old state (keep 30 days)
    console.log('\n🧹 Cleaning up old state...');
    const deletedCount = stateManager.cleanup(30);
    console.log(`   Removed ${deletedCount} items older than 30 days`);

    // Final stats
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`\n✨ Daily Brief complete in ${duration}s`);

    stateManager.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

async function deliverToNotion(briefing: string, itemCount: number, sourceCount: number): Promise<string> {
  if (!process.env.NOTION_API_KEY || !process.env.NOTION_DATABASE_ID) {
    console.warn('   ⏭️  Notion credentials not configured, skipping');
    return 'skipped';
  }

  try {
    const notion = new NotionDelivery();
    const url = await notion.deliver(briefing, { itemCount, sourceCount });
    return url;
  } catch (error) {
    throw new Error(`Notion delivery failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function deliverToGmail(briefing: string): Promise<string> {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REFRESH_TOKEN || !process.env.GMAIL_SEND_ADDRESS) {
    console.warn('   ⏭️  Gmail credentials not configured, skipping');
    return 'skipped';
  }

  try {
    const gmail = new GmailDelivery();
    const messageId = await gmail.deliver(briefing);
    return messageId;
  } catch (error) {
    throw new Error(`Gmail delivery failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Run main function
main();
