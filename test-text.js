const Jimp = require('jimp');

async function test() {
  // Load the template
  const template = await Jimp.read('Header and Footer Template.png');

  // Load font
  const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);

  // Add title text at different positions to test
  const positions = [
    { x: 250, y: 10, label: 'pos1' },
    { x: 250, y: 18, label: 'pos2' },
    { x: 250, y: 24, label: 'pos3' },
    { x: 400, y: 10, label: 'pos4' },
    { x: 400, y: 18, label: 'pos5' },
    { x: 400, y: 24, label: 'pos6' },
  ];

  for (const pos of positions) {
    const testImg = template.clone();
    testImg.print(font, pos.x, pos.y, 'LÍNGUA PORTUGUESA');
    await testImg.writeAsync(`test_${pos.label}_x${pos.x}_y${pos.y}.png`);
    console.log(`Created test_${pos.label}_x${pos.x}_y${pos.y}.png`);
  }

  console.log('Test images created. Check them to find the right position.');
}

test().catch(console.error);
