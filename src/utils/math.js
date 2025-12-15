// 数学工具函数

export function random(min, max) {
    return Math.random() * (max - min) + min;
}

export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}



