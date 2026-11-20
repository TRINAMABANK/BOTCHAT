import { CentralBrainService } from '../server/services/centralBrainService.js';
import { initDatabase } from '../server/db.js';

async function main() {
  console.log('=== TEST: PREVENT INTERNAL KNOWLEDGE LEAK IN SALES INQUIRIES ===');
  await initDatabase();

  const salesQueries = [
    'anh muốn mua cafe',
    'anh muốn mua nước hoa',
    'bên em có laptop dell không',
    'máy in canon giá bao nhiêu',
    'anh muốn mua xe máy',
    'bên bạn có quạt máy panasonic không',
    'tủ lạnh hitachi 4 cánh',
    'bên mình kinh doanh những sản phẩm gì',
    'tư vấn giúp tôi sản phẩm phù hợp'
  ];

  let passed = true;

  for (const q of salesQueries) {
    const res = await CentralBrainService.processChat({
      message: q,
      conversationId: 'test_sales_no_leak'
    });

    const reply = res.reply || '';
    console.log(`\n-----------------------------------------`);
    console.log(`[QUERY]: "${q}"`);
    console.log(`[TOOLS USED]:`, res.toolsUsed);
    console.log(`[REPLY SNIPPET]:`, reply.slice(0, 150).replace(/\n/g, ' '));

    const forbiddenTerms = [
      'nam a bank',
      'namabank',
      'quy chế',
      'quy che',
      'quy trình',
      'xử lý tài sản',
      'hội đồng xử lý',
      'văn bản 409',
      'quy chế 409'
    ];

    const hasForbidden = forbiddenTerms.some(term => reply.toLowerCase().includes(term));
    if (hasForbidden) {
      console.error(`❌ FAIL: Reply contains forbidden internal knowledge term! Query: "${q}"`);
      console.error(`Full reply:\n${reply}`);
      passed = false;
    } else {
      console.log(`✓ PASS: Zero internal knowledge leak.`);
    }

    if (res.toolsUsed.includes('search_knowledge_base')) {
      console.error(`❌ FAIL: 'search_knowledge_base' was called for a sales query! Query: "${q}"`);
      passed = false;
    } else {
      console.log(`✓ PASS: 'search_knowledge_base' was NOT called.`);
    }
  }

  // Also verify that explicit document queries STILL work properly
  console.log(`\n-----------------------------------------`);
  console.log(`[TEST EXPLICIT DOC QUERY]: "Quy chế 409 liên quan xử lý tài sản Nam A Bank"`);
  const docRes = await CentralBrainService.processChat({
    message: 'Quy chế 409 liên quan xử lý tài sản Nam A Bank',
    conversationId: 'test_doc_query'
  });
  console.log(`[DOC TOOLS USED]:`, docRes.toolsUsed);
  console.log(`[DOC REPLY SNIPPET]:`, (docRes.reply || '').slice(0, 150).replace(/\n/g, ' '));
  if (!docRes.toolsUsed.includes('search_knowledge_base')) {
    console.error(`❌ FAIL: Explicit doc query did not invoke search_knowledge_base!`);
    passed = false;
  } else {
    console.log(`✓ PASS: Explicit doc query correctly used search_knowledge_base.`);
  }

  if (passed) {
    console.log('\n🎉 ALL SEPARATION OF KNOWLEDGE & SALES TESTS PASSED 100%!');
  } else {
    console.error('\n⚠️ SOME TESTS FAILED. PLEASE REVIEW ABOVE.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
