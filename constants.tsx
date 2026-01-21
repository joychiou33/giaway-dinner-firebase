import { MenuItem } from './types';

export const INITIAL_MENU: MenuItem[] = [
  {
    id: '1',
    name: '招牌滷肉飯',
    price: 45,
    category: '主食',
    description: '手切五花肉慢火燉煮，肥而不膩。',
    image: 'https://picsum.photos/seed/rice/300/200',
    available: true
  },
  {
    id: '2',
    name: '古早味乾麵',
    price: 50,
    category: '主食',
    description: '特製油蔥酥與Ｑ彈手工麵條。',
    image: 'https://picsum.photos/seed/noodles/300/200',
    available: true
  },
  {
    id: '3',
    name: '雞肉飯',
    price: 55,
    category: '主食',
    description: '鮮嫩雞絲搭配香噴噴雞油。',
    image: 'https://picsum.photos/seed/chicken/300/200',
    available: true
  },
  {
    id: '4',
    name: '燙青菜',
    price: 40,
    category: '小菜',
    description: '每日嚴選新鮮季節蔬菜。',
    image: 'https://picsum.photos/seed/veg/300/200',
    available: true
  },
  {
    id: '5',
    name: '滷蛋',
    price: 15,
    category: '小菜',
    description: '滷至入味的茶香蛋。',
    image: 'https://picsum.photos/seed/egg/300/200',
    available: true
  },
  {
    id: '6',
    name: '豆干海帶拼盤',
    price: 40,
    category: '小菜',
    description: '滷味拼盤，份量足。',
    image: 'https://picsum.photos/seed/tofu/300/200',
    available: true
  },
  {
    id: '7',
    name: '貢丸湯',
    price: 35,
    category: '湯品',
    description: 'Ｑ彈貢丸搭配清甜大骨湯。',
    image: 'https://picsum.photos/seed/soup/300/200',
    available: true
  },
  {
    id: '8',
    name: '虱目魚肚湯',
    price: 120,
    category: '湯品',
    description: '無刺魚肚，鮮美甘甜。',
    image: 'https://picsum.photos/seed/fish/300/200',
    available: true
  },
  {
    id: '9',
    name: '古早味紅茶',
    price: 25,
    category: '飲料',
    description: '香甜不澀的經典風味。',
    image: 'https://picsum.photos/seed/tea/300/200',
    available: true
  },
  {
    id: '10',
    name: '無糖綠茶',
    price: 25,
    category: '飲料',
    description: '清爽解膩，回甘好喝。',
    image: 'https://picsum.photos/seed/greentea/300/200',
    available: true
  }
];

export const TABLES = ['1', '2', '3', '5', '6', '7', '8', '9', '10', '外帶'];