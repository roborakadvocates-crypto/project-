import { Consultant } from './types';

export const INITIAL_CONSULTANTS: Consultant[] = [
  {
    id: '1',
    name: 'سالم الكيت',
    title: 'محامٍ ومستشار قانوني',
    specialty: 'كافة أنواع القضايا',
    price: 1500,
    imageUrl: './founder.png',
    bio: 'مؤسس المكتب، يتمتع بخبرة واسعة وعريقة في ساحات المحاكم.'
  },
  {
    id: '4',
    name: 'ليلى العتيبي',
    title: 'محامية',
    specialty: 'كافة أنواع القضايا',
    price: 1000,
    imageUrl: 'https://picsum.photos/seed/laila/400/400',
    bio: 'محامية مترافعة في جميع محاكم الدولة الاتحادية والمحاكم المحلية في أبوظبي ودبي ورأس الخيمة'
  },
  {
    id: '3',
    name: 'المحامي/ محمود حنفي',
    title: 'محامي',
    specialty: 'استئناف وتمييز',
    price: 1000,
    imageUrl: 'https://picsum.photos/id/1012/400/400',
    bio: 'محامي بالإستئناف والتمييز محاكم رأس الخيمة. خبرة طويلة في عالم المحاماة والقانون.'
  },
  {
    id: '5',
    name: 'المستشار/ عبيده عمر',
    title: 'مستشار قانوني',
    specialty: 'كافة أنواع القضايا',
    price: 1000,
    imageUrl: 'https://picsum.photos/seed/obaida/400/400',
    bio: 'مستشار قانوني خبرة في عالم المحاماة والقانون.'
  }
];
