import { Tree, Task, Medal, Reward, Message } from './types';

export const TREES: Tree[] = [
  {
    id: '1',
    name: '苹果树',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuALY2GL7N7i487HGFFGwJOOToyrNJ6-3CUrIU7erHqrru2o7wYtnz64Cjry1fCsDYSpDO8fGb0A16yFaTQgJ4tLkYE6zAs5PFiRmR9sqmgdhDViXacLD4PdAuWnGXo-b8ZG2a36sPpUK9oAWT0Iy47f60SmJVC9WtUcWZrac3XmuEyqlLYC6Ln4vlND5qHlnsuD-c63RmhMbJNpTkg8JPoUS6KGbZjEuWKm9yVFjmMQeWmqFGCtvYIIchPK2K60dNC-2GO--hCKC5l0',
    status: 'completed',
    progress: 100
  },
  {
    id: '2',
    name: '橙子树',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBoBuu-Jq1H47sL5VFC7qmkQe3ia64lkMWd1t0X_zvvbs00SdQ-S0GXMAtZ5kVDZQC6jez3ZsNkjNcNAq2Nmd0XVUyO7tHkDTWC1c_hq8ks2iDVDEFH5NQ45XDpjVcxkIk7859qGmhj5fVDp0BjEkJIzG1b7zI-zfl3zRtPJpq_sfqkK7Bztldx9WQePMae0QbTNa2wcjVtgXgzCTi_n71-hxhbT66r_tLJTa2V2umGLHJAVO5wqq4ff7ySN3EIsE_rEJEGRnC9Xe9n',
    status: 'completed',
    progress: 100
  },
  {
    id: '3',
    name: '梨树',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBKA2gOym2_3uWbKSj0CTXRV28kx_20LcuB6UtvWo6U4C4WgIOTnMyoPnsI241DnTG-ndgeAjQW20NirkEsvphoGnnh-Fcttia36jooc1MjZ48TG5KNi5uHFHsRhN94kn7rzzE8PHlSRXxhM9ibKNpC0CtKH9GNawz4ngGjb7l6b6RoLhhtdzCUofsMAx8NFjFB8DFQA7f20hLnUwHg-uW11v0BhP6dtrssHXTBDGv4a5Z6Cf65GRUhJiHZ5JuzieEfFngIBXSiERQo',
    status: 'completed',
    progress: 100
  },
  {
    id: '4',
    name: '樱桃树',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuANBYQXFgiTcQRNOSeh-cD6xJQQkBVQGSx_yUB1858eWau6VPv5_A1B36WMTrIr7TpV1sLJpkTFTB4iS7qQlSQtiT6-vpLQFY6ui-1PKDAjQLHESzHUvEf-osnRoHjgn6eIxpiOfUU77Z6q1iGbJTs9AtofoF7pU3yXk7kfycxc-Si8H1wdOqWGY8XnWMsy9ESleMowzBapVLbRopWKEVk4siNMwl1fvoscZFysWlnBKEd-Jgz127FVw17h3zYi6nzhbgnzX3Qa6k61',
    status: 'growing',
    progress: 40
  },
  {
    id: '5',
    name: '桃树',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBU-HnFZLmdcjjgBzj05l3Cwa8UgmMqDscaHNr7x-iJEKCIqh-WTixR_VoCsGTTYKN8d3_RD-jTPaen_tE6881sXYm6wbQ3Rj_stNOZXGzcjUD7lK2hmsQMhdqWsVjwJk0WU95kum2u0qfDx93vbU3_eoCKY7SFYNxVWuZ3_DGEOATFKlICumm4SiB3JKe5TPU7CtMyYJUpG-LyNFCmuuVAD94e27GtHvQEECcKUGZyQYaOLbZw3ECi3t6AlI-QlYQ34zomoPq55qP6',
    status: 'completed',
    progress: 100
  },
  {
    id: '6',
    name: '芒果树',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA417tlpzMxqEBXKQJHU_T5B10wX-XZlz5JWHqrwpAOQ00PERCZDkelmW9469jaoeIrU4e98sPaK7dP03qb7Upd4A0WNPvUl25JtgQ4s1BJs4F2UF0WxMLhBApqJE34w9PZYVjKAzLzO1xb3NdWqIqJhMTUqJXXGunv1TAPb5oe_OQYfhKtUrvq6ttLazso4eIaB9KR3o4wp_dNRZilI8g9D3KiI7_QwqcgL-FEFtdrGE0V16UhTqjeZpeuaZoOF3ZxH-UeU5LB9mNZ',
    status: 'completed',
    progress: 100
  }
];

export const TASKS: Task[] = [
  {
    id: 't1',
    title: '刷牙',
    type: '小利奥的每日习惯',
    time: '上午 8:30',
    status: 'pending',
    childName: '小利奥',
    treeName: '银杉',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAhbiF98J-HMsjHE2xkoIo2x8F3MrAnVpdKJpOXtKoieNiZTcCw15dDHkflpA19bHzWtMLAe4DiEdNfXr1Wp84FXX6_sOa1-n7iaVQFh9JRq4IK_sxqcvDmLqVpsVW6YrLMj_3a-LDpqfAO2vCYYEu13tNTRdGAg2iPbbMwFjVYJvLoNoTGjilpefeWTO9AqmDxL14A1WiQYoGl5t46Zlx7lAW5-8zDgDgkXyVObhUPMAxvAIaZuv7BEgZVUgXaWnFfuKW4mZAIMIG7',
    progress: 65
  },
  {
    id: 't2',
    title: '整理床铺',
    type: '米娅的每日习惯',
    time: '上午 7:45',
    status: 'pending',
    childName: '米娅',
    treeName: '樱花树',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB14iMwCVIgIuQNI3a2peAitpDJafsmRsjfZ7RsJ6W6UTUN60hYofbNaxInX-ExvCdrelakMUQ24TnKg0wTYe_vGhocA1zx9iXU8tPuPR-8WlVMC2oxgpnyWdsjgx3Ztus8KrOxOhqFs0uw3V2bZ4cyKWLTpwPHA1ULQOIyl36W0pQfzNdMRxachCLprO-SNxfik-iRDT1Exy7oqyOMY2neP9mJcG1n3670QTCm9m95bXlgFkDO0XglPTXS-UxRRGmcDOm-TyQKpFLo',
    progress: 40
  },
  {
    id: 't3',
    title: '阅读 20 分钟',
    type: '小利奥的每日习惯',
    time: '昨天',
    status: 'pending',
    childName: '小利奥',
    treeName: '古橡树',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAibDT0VIG9_VyU0Y7IW7NEGBQzdXXotM4EeGGNy1zxxzkgOhDcBIwumFq3OmHTS9U4BX83YmnswDS-si1XwI_lFH8ejnZ2NOrLWMWmFN921cyCsf3_ssVB9oowu3jFCtXwHi4GFZKGdH7xlK_aNPzns4R-u28UJXGBDNd98ZqTJ-FjTkKgP0e3_Jx-Nz6zqdINX9IfBUhvzw4YQyjX-18oUBf0AmGDnX6YyKFdiHA2fuvNogSohHesCoEn7G4Hkg5MT5OqTwcLeM0t',
    progress: 90
  }
];

export const MEDALS: Medal[] = [
  { id: 'm1', name: '早起小标兵', icon: 'wb_sunny', unlocked: true, color: 'from-yellow-300 to-primary' },
  { id: 'm2', name: '7天连续达人', icon: 'local_fire_department', unlocked: true, color: 'from-orange-400 to-red-500' },
  { id: 'm3', name: '浇水小能手', icon: 'water_drop', unlocked: true, color: 'from-blue-400 to-blue-600' },
  { id: 'm4', name: '水果采摘员', icon: 'nutrition', unlocked: false, color: 'from-slate-300 to-slate-400' },
  { id: 'm5', name: '根深蒂固', icon: 'forest', unlocked: false, color: 'from-slate-300 to-slate-400' },
  { id: 'm6', name: '闪亮之星', icon: 'stars', unlocked: true, color: 'from-purple-400 to-indigo-600' },
  { id: 'm7', name: '环保小英雄', icon: 'eco', unlocked: true, color: 'from-emerald-400 to-teal-600' },
  { id: 'm8', name: '快速成长期', icon: 'energy_savings_leaf', unlocked: false, color: 'from-slate-300 to-slate-400' },
  { id: 'm9', name: '顶尖选手', icon: 'emoji_events', unlocked: false, color: 'from-slate-300 to-slate-400' }
];

export const REWARDS: Reward[] = [
  { id: 'r1', name: '30分钟游戏时间', price: 200, category: 'activity', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCJXo5JmQpCTp3DS_gYEYEKvrpiDTo-5BCO5MUyRYh8MEVJ4cbo1pBRt7sMgtonU_S6ITPrli8ciPJa20Dq8Ahvw0o0B1DBfN12hPlZAOxEZ5IEL8UYAecx4J1_zC5veB1A6FNgwwGlrcCqxSNaDrzQSUh3uBDbWkKK8C9aVsNN5VvkAKGuOv3tVW5hvTzdrFXqvnpwMdWE0u6asOQWF_2euexex29x5Vh9oKS9bLtnl1yAiubCcHoZxdUEw-EQ3BvHWlFlR43IHgYK' },
  { id: 'r2', name: '新玩具', price: 1000, category: 'toy', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDteOcpm2oHVY0AudRaMksYxFcORLynQEMJ4-rRXxjQcN7P_jyhGitMRO-11dYoUCETOqK286AHm8egxNHJgE3xauHNameN0TDl2zqYiWwH5-HDBwDk0lO_ai7fHoIz1IP5ieAtecU0JYvU90_dwixjEWg5ipFsECSnvwG0nnosG0WshHb4zCzbW7OhdIp0DfBLYx3i_ABw3E8W8-0fmOZiijS4Guxx55G1kslOtYk8z1mSGS-3iPiGATbn3Nei_G3ke1fN7dKrhEev' },
  { id: 'r3', name: '冰淇淋', price: 150, category: 'snack', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBZKZTS-qPjt6Wj4riS58CMxhcbNjjwvaJeQRfG13CPoUpIvkIgwbmliGgJqGotsGpoINeoqc97MAKl_qG92UkzgrbINCkp6JZb_gWZkGExXoqk18dSD-URxHVO6V9bdwh94Ey9d7389hfQCUJuzrbDJpydHWQMw49_8rmRcPoFKIEiX5VETExqL0bUaQpbM-Deg80T6LNBFQUixuspozGtnPvy-fQgVu7O2Qgsrf9cWaW1dHtJjg4-Ry2eyTRjHY_6J2b1XvthwQKI' },
  { id: 'r4', name: '额外公园游玩', price: 300, category: 'activity', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBUsLXvqd7DOSeRsLa4Msgk9SvHR-hmD7CiLNXMMhTuM9zD5wjVsnLbwmLTwrNunaA0SRknUFJprO1IkG5ZTcviIH6guzUT_-MTwRRRX0KiQBihfOKcsOwBddGaWIRN3kEpVAqGpU5rbMQZxQZA50422ovV4mAdi6nsuI0yC0mV8NL-AklA8jvTSqIaRugnmUe1HY432ZChx7QUdOSqz8N0CgqbQx1ouk37a4GqyDyu1UiGPhFcvMesEGRGhlu2Q7CRKzQY147QidB7' },
  { id: 'r5', name: '电影之夜', price: 500, category: 'activity', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCvVh-1dXlrXa13oubvqk8jT-RYChfRmVD8HbPhXIz7E3bw8TtVsC54g706B-YNSz-IaPg8himJe6mJfoezln3VOaYfEglQt8TVAoWXidBRvbIic_6sEDoGYf8j7geF6qZ7eIWSGo08hQ5or7gnO2dDmse6nBA5GlpsHsA0Zfyn7X0qEE3BUVPyzne5VGQTPIQYNYoUa9fwtDD4gYY-ZYzBF6vUgV71wHHBJvUmrZQXqBvblReM43-MfQ7b8XO7Wr5tquBqvQEAPGwN' },
  { id: 'r6', name: '晚睡1小时', price: 300, category: 'activity', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCHiLlHIfV4lmVGySKG5_QHwAf7ktROvBp_eWErI54w6PF3Tww7Akwy8FEoCODT4yxb731JfT5OHc0Kbh6zStDPSP5sfsWFAhSwXxrIUrhHTvkY81cwG6jypJ7Tmf3saJmV5fqjsFFLGcqbcxq_3C_V4M0iui83-xAzM22AzFb5IJ02nEkyhYvEn7dHbtRqPrwgCE94GHsMJrN7jxyMXKgu1ekIcxVG6XF5Zbq7TnepBvdIaScmXn6ZhudLEctyEaMH2BWdiEVeWTJQ' }
];

export const MESSAGES: Message[] = [
  {
    id: 'm1',
    sender: 'Mom',
    text: '宝贝，妈妈看到你已经完成了今天的阅读目标啦，真棒！',
    time: '下午 4:25',
    type: 'text'
  },
  {
    id: 'm2',
    sender: 'Mom',
    text: '为你今天的阅读表现感到骄傲！📖🌟 继续加油哦！ ❤️🍦',
    time: '下午 4:30',
    type: 'text'
  },
  {
    id: 'm3',
    sender: 'Mom',
    text: '',
    time: '下午 4:31',
    type: 'sticker',
    content: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDM3w6kafabtKRA-eGr2xRIS6vex2RLR7b-WM1Lmnodd4len_eLu-j7i1xiT60uFQqCQvmzUbpi7UjOq3eNYPoZE7CTKM3tfhPa4hXCRTGTrOcU5F0I6cSQUwp7h3dBAbIukvBRPT1s7jkm9E20L9pri7nHKAzbSfEXim-7ZPYtkqvqnGrprXBDRZfygfeIdnTM6l8r_rf4nrkoN9UyTj7G0y7d7-2tmZcG_qOcaQUyto_4Iz1udZnRqLFBL8U9OprYhcFf2U0Af-a2'
  }
];
