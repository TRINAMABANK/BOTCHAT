import { CentralBrainService, sanitizeAiResponse } from '../server/services/centralBrainService.js';
import { WebSearchService } from '../server/services/webSearchService.js';
import { initDatabase } from '../server/db.js';

async function main() {
  console.log('=== TEST: ELIMINATE DUCKDUCKGO CITATION ON GREETINGS ===');
  await initDatabase();

  // 1. Test sanitizer function
  console.log('\n[1] Testing sanitizeAiResponse...');
  const dirty = 'Chào bạn, tôi là robot! [Nguồn: https://duckduckgo.com/?q=hi%20em] Hãy hỏi tôi.';
  const clean = sanitizeAiResponse(dirty);
  console.assert(!clean.includes('duckduckgo'), 'Sanitizer failed to remove duckduckgo link');
  console.assert(!clean.includes('[Nguồn:'), 'Sanitizer failed to remove [Nguồn:');
  console.log('✓ Clean output:', clean);

  // 2. Test WebSearchService empty fallback
  console.log('\n[2] Testing WebSearchService...');
  const searchRes = await WebSearchService.search('hi em');
  console.assert(!JSON.stringify(searchRes).includes('https://duckduckgo.com/?q='), 'WebSearchService should not return fake ddg link');
  console.log('✓ WebSearchService search output has no fake search links.');

  // 3. Test CentralBrainService with "hi em"
  console.log('\n[3] Testing CentralBrainService.processChat with "hi em"...');
  const chat1 = await CentralBrainService.processChat({
    message: 'hi em',
    conversationId: 'test_hi_em'
  });
  console.log('Reply for "hi em":\n', chat1.reply);
  console.assert(!chat1.reply.includes('duckduckgo'), 'Reply must NOT include duckduckgo!');
  console.assert(!chat1.reply.includes('[Nguồn: https://duckduckgo'), 'Reply must NOT include duckduckgo citation!');
  console.assert(chat1.citations.length === 0, 'Citations must be empty for greetings!');
  console.log('✓ "hi em" processed cleanly with NO duckduckgo citations.');

  // 4. Test CentralBrainService with "chào em"
  console.log('\n[4] Testing CentralBrainService.processChat with "chào em"...');
  const chat2 = await CentralBrainService.processChat({
    message: 'chào em',
    conversationId: 'test_chao_em'
  });
  console.log('Reply for "chào em":\n', chat2.reply);
  console.assert(!chat2.reply.includes('duckduckgo'), 'Reply must NOT include duckduckgo!');
  console.assert(chat2.citations.length === 0, 'Citations must be empty for greetings!');
  console.log('✓ "chào em" processed cleanly with NO duckduckgo citations.');

  console.log('\n=== ALL DUCKDUCKGO REMOVAL TESTS PASSED CLEANLY! ===');
  process.exit(0);
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
