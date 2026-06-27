export const numberToWords = (num: number): string => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const inWords = (n: number): string => {
        if ((n = Math.floor(n)) === 0) return 'Zero';

        let str = '';
        if (n >= 100000) {
            str += inWords(n / 100000) + ' Lakh ';
            n %= 100000;
        }
        if (n >= 1000) {
            str += inWords(n / 1000) + ' Thousand ';
            n %= 1000;
        }
        if (n >= 100) {
            str += inWords(n / 100) + ' Hundred ';
            n %= 100;
        }
        if (n > 0) {
            if (str !== '') str += 'and ';
            if (n < 20) str += a[n];
            else {
                str += b[Math.floor(n / 10)];
                if (n % 10 > 0) str += '-' + a[n % 10];
            }
        }
        return str.trim();
    };

    return inWords(num).trim();
};
