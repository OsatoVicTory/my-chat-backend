exports.isRead = (lastView, createdAt) => {
    return new Date(createdAt).getTime() < new Date(lastView).getTime();
}

exports.sortAndMergeIds = (first, sec) => {
    let i=10, minn = Math.min(first.length, sec.length);
    while(i<minn) {
        if(first[i] < sec[i]) return first+sec;
        else if(first[i] > sec[i]) return sec+first;
        else i++;
    }
    return minn == first.length ? first+sec : sec+first;
}

exports.sameDay = (time, cur) => {
    if(!time) return false;
    const date = String(new Date(time));
    const curDate = String(new Date(cur));
    if(date.slice(0, 15) !== curDate.slice(0, 15)) return false;
    else return true;
}

exports.getTime = (cur) => {
    const date = new Date();
    const curDate = new Date(cur);
    if(date.getFullYear() !== curDate.getFullYear()) {
        return String(curDate).slice(4, 15);
    } else if (date.getMonth() !== curDate.getMonth()) {
        return String(curDate).slice(0, 10);
    } else {
        let diff = date.getDate() - curDate.getDate();
        if(diff > 1) return String(curDate).slice(0, 3);
        else if(diff == 1) return `Yesterday`;
        else return "Today";
    }
}

const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
exports.getRandomColor = () => {
    let color = '#';
    for(var i=0;i<6;i++) {
        if(i%2) color += Math.floor(Math.random() * 6);
        else color += alpha[Math.floor(Math.random() * 25)];
    }
    return color;
}

exports.formatImagesTime = (when) => {
    const date = new Date(when);
    const curDate = new Date();
    const time = String(date);
    if(date.getFullYear() !== curDate.getFullYear()) {
        return time.slice(4, 15);
    } else if(date.getMonth() !== curDate.getMonth()) {
        return time.slice(0, 10);
    } else {
        let diff = date.getDate() - curDate.getDate();
        if(diff > 1) return `${time.slice(0, 3)} at ${time.slice(15, 20)}`;
        else if(diff == 1) return `Yesterday at ${time.slice(15, 20)}`;
        else return `Today at ${time.slice(15, 20)}`;
    }
}

exports.convertToBase64URL = (obj) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(obj);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (err) => reject(err);
    });
};

exports.convertToBuffer = (base64) => {
    const string = base64.split(",")[1];
    return Buffer.from(string, 'base64');
}