exports.fastFindInDBData = (refId, DB) => {
    var target = parseInt(refId.slice(9, refId.length));
    return DB[target-1];
};

exports.mergeSort = (data) => {
    let arr = [...data];
    let tmp = [];
    let i = 0, j = 0, itr = 0, mid = 0;
    function recur(l, r) {
        if(l >= r) return;
        mid = l + Math.floor((r-l) / 2);
        recur(l, mid);
        recur(mid + 1, r);
        tmp = [];
        i = l;
        j = mid+1;
        itr = 0;
        while(i <= mid && j <= r) {
            if(arr[i].messageId <= arr[j].messageId) tmp[itr++] = arr[i++];
            else tmp[itr++] = arr[j++];
        }
        while(i <= m) tmp[itr++] = arr[i++];
        while(j <= r) tmp[itr++] = arr[j++];
        i = 0;
        while(i < tmp.length) arr[i+l] = tmp[i++];
    };

    recur(0, arr.length - 1);
    return arr;
};

exports.binSearch = (target, DB) => {
    let L = 0, R = DB.length-1;
    while(L <= R) {
        var mid = L + Math.floor((R-L) / 2);
        if(DB[mid].messageId == target) return mid;
        else if(DB[mid].messageId  < target) L = mid+1;
        else R = mid-1;
    };

    return null;
};