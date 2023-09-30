function loadLocalStorage() {
    if (localStorage.getItem("settings")) {
        const currentLocalStorage = JSON.parse(localStorage.getItem("settings"));

        [...document.querySelectorAll('[name="mirror"]')].forEach((ele) => {
            ele.checked = ele.value === currentLocalStorage.mirror.val;
        });

        document.querySelector("#custom-mirror").value = currentLocalStorage.mirror.custom;

        document.querySelector("#dim").value = currentLocalStorage.background.dim;
        document.querySelector("#bgDimVal").innerHTML = `${parseInt(currentLocalStorage.background.dim * 100)}%`;
        document.querySelector("#overlay").style.backgroundColor = `rgba(0 0 0 / ${currentLocalStorage.background.dim})`;

        document.querySelector("#blur").value = currentLocalStorage.background.blur;
        document.querySelector("#bgBlurVal").innerHTML = `${parseInt((currentLocalStorage.background.blur / 20) * 100)}px`;
        document.querySelector("#overlay").style.backdropFilter = `blur(${currentLocalStorage.background.blur}px)`;

        document.querySelector("#master").value = currentLocalStorage.volume.master;
        document.querySelector("#masterVal").innerHTML = `${parseInt(currentLocalStorage.volume.master * 100)}%`;
        // masterVol = currentLocalStorage.volume.master;

        document.querySelector("#music").value = currentLocalStorage.volume.music;
        document.querySelector("#musicVal").innerHTML = `${parseInt((currentLocalStorage.volume.music / 0.4) * 100)}%`;
        // musicVol = currentLocalStorage.volume.music;

        document.querySelector("#effect").value = currentLocalStorage.volume.hs;
        document.querySelector("#effectVal").innerHTML = `${parseInt((currentLocalStorage.volume.hs / 0.4) * 100)}%`;

        document.querySelector("#softoffset").value = currentLocalStorage.mapping.offset;
        document.querySelector("#softoffsetVal").innerHTML = `${parseInt(currentLocalStorage.mapping.offset)}ms`;
        // hsVol = currentLocalStorage.volume.hs;

        Object.keys(currentLocalStorage.sliderAppearance).forEach((k) => {
            if (["snaking", "legacy", "hitAnim"].includes(k)) {
                document.querySelector(`#${k}`).checked = currentLocalStorage.sliderAppearance[k];
            }
        });

        document.querySelector("#beat").value = currentLocalStorage.mapping.beatsnap;
        document.querySelector("#beatVal").innerHTML = `1/${currentLocalStorage.mapping.beatsnap}`;
    }
}

function Clamp(val, from, to) {
    return Math.max(Math.min(val, to), from);
}

// https://github.com/ppy/osu-web/blob/master/resources/js/utils/beatmap-helper.ts#L20
const difficultyColourSpectrum = d3
    .scaleLinear()
    .domain([0.1, 1.25, 2, 2.5, 3.3, 4.2, 4.9, 5.8, 6.7, 7.7, 9])
    .clamp(true)
    .range(["#4290FB", "#4FC0FF", "#4FFFD5", "#7CFF4F", "#F6F05C", "#FF8068", "#FF4E6F", "#C645B8", "#6563DE", "#18158E", "#000000"])
    .interpolate(d3.interpolateRgb.gamma(2.2));

// https://github.com/ppy/osu-web/blob/master/resources/js/utils/beatmap-helper.ts#L81
const getDiffColor = (rating) => {
    if (rating < 0.1) return "#AAAAAA";
    if (rating >= 9) return "#000000";
    return difficultyColourSpectrum(rating);
};

const createDifficultyElement = (obj) => {
    const ele = document.createElement("div");
    ele.classList.add("diff");

    const icon = document.createElement("div");
    icon.classList.add("icon");

    const colorRing = document.createElement("div");
    colorRing.classList.add("colorRing");
    colorRing.style.border = `solid 4px ${getDiffColor(obj.starRating)}`;

    icon.append(colorRing);

    const infoContainer = document.createElement("div");
    infoContainer.classList.add("infoContainer");

    const diffName = document.createElement("div");
    diffName.classList.add("diffName");

    const starRating = document.createElement("div");
    starRating.classList.add("starRating");

    diffName.innerText = obj.name;
    starRating.innerText = `Star Rating: ${obj.starRating.toFixed(2)}★`;

    infoContainer.append(diffName, starRating);
    ele.append(icon, infoContainer);

    ele.dataset.filename = obj.fileName;
    ele.dataset.starrating = obj.starRating;
    ele.onclick = loadDiff;

    return {
        ...obj,
        ele,
    };
};

const round = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

const loadColorPalette = (bg) => {
    const vibrant = new Vibrant(bg);
    const swatches = vibrant.swatches();

    // const colors = colorThief.getPalette(bg, 2);
    const rootCSS = document.querySelector(":root");

    const primary = swatches.DarkMuted?.getRgb() ?? swatches.DarkVibrant?.getRgb();
    if (primary) {
        const primaryHex = d3.color(`rgb(${parseInt(primary[0])}, ${parseInt(primary[1])}, ${parseInt(primary[2])})`);
        console.log(primary, primaryHex);
        const primaryPalette = [
            primaryHex.darker(2.0).formatHex(),
            primaryHex.darker(1.5).formatHex(),
            primaryHex.darker(1.0).formatHex(),
            primaryHex.darker(0.5).formatHex(),
            primaryHex.formatHex(),
        ];

        primaryPalette.forEach((val, idx) => {
            rootCSS.style.setProperty(`--primary-${idx + 1}`, val);
        });
    }

    const accent = swatches.LightVibrant?.getRgb() ?? swatches.LightMuted?.getRgb() ?? swatches.Vibrant?.getRgb();
    if (accent) {
        const accentHex = d3.color(`rgb(${parseInt(accent[0])}, ${parseInt(accent[1])}, ${parseInt(accent[2])})`);
        rootCSS.style.setProperty("--accent-1", accentHex.formatHex());
    }
};

async function loadSampleSound(sample, idx, buf) {
    try {
        if (buf === undefined) {
            const res = (
                await axios.get(`./static/sample/${sample}${idx === 0 ? "" : idx}.wav`, {
                    responseType: "arraybuffer",
                })
            ).data;

            const buffer = await audioCtx.decodeAudioData(res);
            // console.log(`${sample} decoded`);
            hitsoundsBuffer[`${sample}${idx}`] = buffer;
        } else {
            const buffer = await audioCtx.decodeAudioData(buf);
            hitsoundsBuffer[`${sample}${idx}`] = buffer;
        }
    } catch {
        console.log("Unable to decode " + `${sample}${idx}`);
    }
}

function timeout(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function toDataUrl(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.onload = function () {
        var reader = new FileReader();
        reader.onloadend = function () {
            callback(reader.result);
        };
        reader.readAsDataURL(xhr.response);
    };
    xhr.open("GET", url);
    xhr.responseType = "blob";
    xhr.send();
}