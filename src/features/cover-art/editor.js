import qrcode from 'qrcode-generator';

const savedDrafts = new Map();
const storageKey = 'playroom-cover-art-v1';
try {
    const entries = JSON.parse(localStorage.getItem(storageKey) || '[]');
    for (const [key, draft] of entries) {
        const valid = typeof key === 'string' && draft &&
            ['global', 'front', 'spine', 'back', 'nfc'].every(panel =>
                draft[panel] && typeof draft[panel] === 'object' &&
                Object.values(draft[panel]).every(value => typeof value === 'string')
            );
        if (valid) savedDrafts.set(key, draft);
    }
} catch {
    // Start with game defaults if storage is unavailable or contains invalid JSON.
}

function persistDrafts() {
    try {
        localStorage.setItem(storageKey, JSON.stringify([...savedDrafts]));
        return true;
    } catch {
        return false;
    }
}

function readImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read image.'));
        reader.readAsDataURL(file);
    });
}

export function mountCoverEditor(root, games, initialGameId) {
    let active = true;
    const gameOptions = [];

    const marioLogoUrl =
        'https://images.launchbox-app.com//237f73a1-7b42-4ded-af30-87f53a6d31fd.png';
    const zeldaLogoUrl =
        'https://images.launchbox-app.com//b4c526e2-0aa6-4be0-b891-fce658dc412b.png';
    const metroidLogoUrl =
        'https://images.launchbox-app.com//593a64c0-bfb3-4940-827a-53683cc663ae.png';
    const presetLogos = new Map([
        [marioLogoUrl, '/cover-art/mario_logo.png'],
        [zeldaLogoUrl, '/cover-art/zelda_logo.png'],
        [metroidLogoUrl, '/cover-art/metroid_logo.png'],
    ]);
    const marioSpineLogo = '/cover-art/mario_spine_logo.png';

    const presets = {
        mario: {
            title: 'Super Mario Bros. 3',
            year: '1990',
            jacket: '#ffea00',
            gameLogo: marioLogoUrl,
            manual: 'https://www.nintendo.co.jp/clv/manuals/en/pdf/CLV-P-NAACE.pdf',
            description:
                'Travel through eight worlds with Mario and Luigi. Take flight as Raccoon Mario, discover secrets, and rescue the kings.',
            art: '/cover-art/mario_art.webp',
            screen: '/cover-art/mario_screen.png',
        },
        zelda: {
            title: 'The Legend of Zelda',
            year: '1987',
            jacket: '#a37e38',
            gameLogo: zeldaLogoUrl,
            manual: 'https://www.nintendo.co.jp/clv/manuals/en/pdf/CLV-P-NAANE.pdf',
            description:
                'Explore Hyrule, recover the eight pieces of the Triforce of Wisdom, and rescue Princess Zelda.',
            art: '/cover-art/zelda_art.webp',
            screen: '/cover-art/zelda_screen.png',
        },
        metroid: {
            title: 'Metroid',
            year: '1987',
            jacket: '#9babb4',
            gameLogo: metroidLogoUrl,
            manual: 'https://www.nintendo.co.jp/clv/manuals/en/pdf/CLV-P-NAAQE.pdf',
            description:
                'Explore planet Zebes as Samus Aran. Collect upgrades to stop the Space Pirates.',
            art: '/cover-art/metroid_art.webp',
            screen: '/cover-art/metroid_screen.png',
        },
        custom: {
            title: '',
            year: '',
            description: '',
            accent: '#29282c',
            jacket: '#e5ddca',
            art: '',
            screen: '',
            manual: '',
        },
    };

    const data = {};
    for (const item of games) {
        const presetKey = /super mario bros[. ]*3/i.test(item.title)
            ? 'mario'
            : /^the legend of zelda$/i.test(item.title)
              ? 'zelda'
              : /^metroid$/i.test(item.title)
                ? 'metroid'
                : '';
        const preset = presets[presetKey] || presets.custom;
        data[item.id] = {
            ...preset,
            ...Object.fromEntries(
                Object.entries(item).filter(([, value]) => value !== undefined),
            ),
            preset: presetKey,
            gameLogo: preset.gameLogo || item.gameLogo || '',
            jacket: preset.jacket,
        };
        gameOptions.push(new Option(item.title, item.id));
    }
    const byId = (id) => root.querySelector('#' + id);
    const game = byId('game');
    game.replaceChildren(...gameOptions);
    game.value =
        initialGameId && data[initialGameId] ? initialGameId : games[0].id;
    game.closest('label').hidden = games.length === 1;
    const wrap = byId('wrap');
    const cover = byId('cover');
    const appLogo = byId('cover-app-base');
    const appLogoSource = appLogo.getAttribute('src');
    byId('cover-app-light').src = appLogoSource;
    const spineArt = byId('spine-art');
    const drafts = savedDrafts;
    let side = 'front';
    let format = 'cassette';

    const frontLogos = {
        original: '/cover-art/nes_front_original.svg',
        black: '/cover-art/nes_front_black.svg',
        white: '/cover-art/nes_front_white.svg',
    };

    const logos = {
        original: '/cover-art/nes_original.svg',
        black: '/cover-art/nes_black.png',
        white: '/cover-art/nes_white.png',
    };

    const fields = {
        title: { label: 'Title', max: 60 },
        year: { label: 'Year', max: 4, numeric: true },
        description: { label: 'Description', area: true, max: 180 },
        manual: { label: 'Manual URL', url: true },
        background: { label: 'Background color', color: true },
        logo: {
            label: 'NES logo',
            options: {
                original: 'Original',
                black: 'Black',
                white: 'White',
                off: 'Hide',
            },
        },
        app: {
            label: 'MiSTer Playroom logo',
            options: {
                auto: 'Auto',
                original: 'Original',
                white: 'White',
                off: 'Hide',
            },
        },
        art: { label: 'Cover artwork URL', url: true, file: true },
        gameLogo: { label: 'Game Logo URL', url: true, file: true },
        screenshotFrame: {
            label: 'Screenshot frame color',
            defaultOption: 'auto',
            options: { auto: 'Auto', black: 'Black', white: 'White' },
        },
    };

    const globalArtwork = ['background', 'art', 'gameLogo'];
    const globalDetails = [
        'title',
        'year',
        'description',
        'manual',
        'logo',
        'app',
    ];

    const panelFields = {
        front: { primary: ['art', 'background'], secondary: ['logo', 'app'] },
        spine: { primary: ['title', 'background'], secondary: ['logo'] },
        back: {
            primary: ['art', 'description', 'manual'],
            secondary: [
                'background',
                'screenshotFrame',
                'gameLogo',
                'title',
                'year',
                'logo',
            ],
        },
    };
    const openPanelOptions = new Set();

    function freshPreset() {
        const preset = data[game.value];
        return {
            global: {
                title: preset.title,
                year: preset.year,
                description: preset.description,
                manual: preset.manual,
                background: preset.jacket,
                logo: 'black',
                app: 'auto',
                art: preset.art ? 'preset:cover' : '',
                gameLogo: preset.gameLogo || '',
            },
            front: {},
            nfc: { art: preset.screen ? 'preset:screen' : 'off' },
            spine: {
                logo: preset.gameLogo ? 'original' : 'white',
                ...(preset.accent ? { background: preset.accent } : {}),
                ...(data[game.value].preset === 'mario'
                    ? { title: 'preset:spine-logo' }
                    : {}),
            },
            back: {
                background: preset.gameLogo ? '' : '#f7f1df',
                art: preset.screen ? 'preset:screen' : 'off',
            },
        };
    }

    function currentDraft() {
        if (!drafts.has(game.value)) drafts.set(game.value, freshPreset());
        return drafts.get(game.value);
    }

    function resolved(panel, key) {
        const draft = currentDraft();
        return draft[panel][key]?.trim() || draft.global[key]?.trim() || '';
    }

    function imageSource(value) {
        if (presetLogos.has(value)) return presetLogos.get(value);
        if (value === 'preset:spine-logo') return marioSpineLogo;
        if (value === 'preset:cover') return data[game.value].art;
        if (value === 'preset:screen') return data[game.value].screen;
        if (/^data:image\/(png|jpeg|webp|gif|svg\+xml);base64,/i.test(value))
            return value;
        if (value.startsWith('blob:')) return value;
        if (value === 'off' || !value) return '';
        try {
            const url = new URL(value);
            return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
        } catch {
            return '';
        }
    }

    function paintImage(element, source) {
        if (!source) {
            element.hidden = true;
            element.removeAttribute('src');
            return;
        }
        if (element.getAttribute('src') !== source) {
            element.hidden = false;
            element.src = source;
        }
    }

    function inkFor(hex) {
        const [red, green, blue] = hex
            .slice(1)
            .match(/../g)
            .map((part) => {
                const channel = parseInt(part, 16) / 255;
                return channel <= 0.04045
                    ? channel / 12.92
                    : ((channel + 0.055) / 1.055) ** 2.4;
            });
        return red * 0.2126 + green * 0.7152 + blue * 0.0722 > 0.179
            ? '#151515'
            : '#fff';
    }

    function render() {
        for (const panel of Object.keys(panelFields)) {
            const background = resolved(panel, 'background') || '#f7f1df';
            const section = byId('print-' + panel);
            section.style.setProperty('--panel-bg', background);
            const ink = inkFor(background);
            section.style.setProperty('--panel-ink', ink);
            section.setAttribute(
                'data-tone',
                ink === '#fff' ? 'dark' : 'light',
            );
            const variants = panel === 'front' ? frontLogos : logos;
            paintImage(
                byId(panel + '-logo'),
                variants[resolved(panel, 'logo')] || '',
            );
        }
        const front = imageSource(resolved('front', 'art'));
        if (cover.getAttribute('src') !== front)
            wrap.style.removeProperty('--art-ratio');
        paintImage(cover, front);
        byId('art-empty').hidden = Boolean(front) && !cover.hidden;
        const appVariant = resolved('front', 'app');
        const playroomLogo = byId('cover-app');
        const darkHeader =
            byId('print-front').getAttribute('data-tone') === 'dark';
        playroomLogo.hidden = appVariant === 'off';
        playroomLogo.setAttribute(
            'data-variant',
            appVariant === 'white' || (appVariant === 'auto' && darkHeader)
                ? 'white'
                : 'original',
        );

        const draft = currentDraft();
        const spineOverride = draft.spine.title?.trim() || '';
        const isSpineImage =
            spineOverride === 'preset:spine-logo' ||
            /^(https?:\/\/|blob:|data:image\/)/i.test(spineOverride);
        const spineImage = spineOverride
            ? isSpineImage
                ? imageSource(spineOverride)
                : ''
            : imageSource(draft.global.gameLogo);
        paintImage(spineArt, spineImage);
        byId('spine-title').textContent = isSpineImage
            ? draft.global.title
            : spineOverride || draft.global.title;
        byId('spine-title').hidden = Boolean(spineImage) && !spineArt.hidden;

        const backLogo = byId('back-game-logo');
        const backLogoSource = imageSource(resolved('back', 'gameLogo'));
        paintImage(backLogo, backLogoSource);
        const frameColor = currentDraft().back.screenshotFrame || 'auto';
        byId('back-art').style.setProperty(
            '--screenshot-frame-color',
            frameColor === 'auto' ? 'var(--panel-ink)' : frameColor,
        );
        const backImage = imageSource(resolved('back', 'art'));
        paintImage(byId('screenshot'), backImage);
        byId('back-art').hidden = !backImage || byId('screenshot').hidden;
        for (const name of ['title', 'year', 'description']) {
            const element = byId('back-' + name);
            element.textContent = resolved('back', name);
            element.hidden =
                !element.textContent ||
                (name === 'title' &&
                    Boolean(backLogoSource) &&
                    !backLogo.hidden);
        }
        renderManual(resolved('back', 'manual'));
        if (format === 'nfc') renderNfc();
    }

    function fitNfcTitle() {
        const title = byId('nfc-back-title');
        if (!active || !title.clientWidth) return;
        title.style.removeProperty('--nfc-title-scale');
        title.setAttribute('data-measuring', '');
        const width = title.clientWidth;
        const needed = title.scrollWidth;
        title.removeAttribute('data-measuring');
        if (needed > width) {
            title.style.setProperty(
                '--nfc-title-scale',
                Math.max(0.61, (width - 1) / needed),
            );
        }
    }

    function renderNfc() {
        const { global: settings } = currentDraft();
        const coverImage = byId('nfc-cover');
        paintImage(coverImage, imageSource(settings.art));
        byId('nfc-empty').hidden = !coverImage.hidden;
        byId('nfc-back-title').textContent =
            settings.title || 'Untitled NES Game';
        fitNfcTitle();
        byId('nfc-description').textContent = settings.description;
        byId('nfc-description-wrap').hidden = !settings.description.trim();
        paintImage(byId('nfc-brand'), appLogoSource);
        const draft = currentDraft();
        const screenshot = byId('nfc-screenshot');
        paintImage(screenshot, imageSource(draft.nfc.art));
        byId('nfc-shot').hidden = screenshot.hidden;
        renderManual(draft.nfc.manual ?? settings.manual, 'nfc');
    }

    function setFormat(next) {
        format = next;
        const nfc = format === 'nfc';
        for (const name of ['cassette', 'nfc']) {
            const button = byId('format-' + name);
            const selected = format === name;
            button.classList.toggle('selected', selected);
            button.setAttribute('aria-pressed', selected);
        }
        for (const id of [
            'stage',
            'case-modes',
            'cassette-footer',
            'cassette-settings',
            'global-section',
            'manual-status',
        ])
            byId(id).hidden = nfc;
        for (const id of ['nfc-stage', 'nfc-fields', 'nfc-status'])
            byId(id).hidden = !nfc;
        byId('editor-title').textContent = nfc
            ? 'Card Settings'
            : 'Cover Settings';
        renderForm();
        if (nfc) renderNfc();
    }

    const lastManual = new Map();
    function renderManual(source, target = 'manual') {
        const raw = source.trim();
        if (raw === lastManual.get(target)) return;
        lastManual.set(target, raw);
        const link = byId(target + '-qr');
        const status = byId(target + '-status');
        link.hidden = true;
        link.removeAttribute('href');
        status.textContent = '';
        if (!raw) return;
        try {
            const url = new URL(raw);
            if (!['https:', 'http:'].includes(url.protocol))
                throw new Error('protocol');
            if (url.href.length > 140) {
                status.textContent =
                    'Use a URL of up to 140 characters for a readable QR code.';
                return;
            }
            const qr = qrcode(0, 'M');
            qr.addData(url.href);
            qr.make();
            const canvas = byId(target + '-canvas');
            const pixels = 8;
            const margin = 4;
            const modules = qr.getModuleCount();
            canvas.width = canvas.height = (modules + margin * 2) * pixels;
            const context = canvas.getContext('2d');
            context.fillStyle = '#fff';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.fillStyle = '#000';
            for (let row = 0; row < modules; row++) {
                for (let col = 0; col < modules; col++) {
                    if (!qr.isDark(row, col)) continue;
                    const x = (col + margin) * pixels;
                    const y = (row + margin) * pixels;
                    context.fillRect(x, y, pixels, pixels);
                }
            }
            link.href = url.href;
            link.hidden = false;
        } catch {
            status.textContent =
                'Enter a complete manual URL starting with https://.';
        }
    }

    function make(tag, properties = {}) {
        return Object.assign(document.createElement(tag), properties);
    }

    function makeField(scope, key) {
        const spineTitleField = scope === 'spine' && key === 'title';
        const field = spineTitleField
            ? { label: 'Title or logo URL', file: true }
            : fields[key];
        const draft = currentDraft();
        const value =
            (scope === 'nfc' && key === 'manual'
                ? (draft.nfc.manual ?? draft.global.manual)
                : draft[scope][key]) || '';
        const isPanelOverride = scope !== 'global' && scope !== 'nfc';
        const container = make('div', { className: 'field' });
        const id = scope + '-' + key + '-input';
        const label = make('label', {
            htmlFor: id,
            textContent:
                (scope === 'back' || scope === 'nfc') && key === 'art'
                    ? 'Screenshot URL'
                    : field.label,
        });
        container.append(label);

        let input;
        if (field.options) {
            input = make('select');
            if (scope !== 'global' && !field.defaultOption) {
                const inherited = field.options[currentDraft().global[key]];
                input.add(
                    new Option(
                        inherited ? 'Global · ' + inherited : 'Global value',
                        '',
                    ),
                );
            }
            for (const [option, name] of Object.entries(field.options))
                input.add(new Option(name, option));
        } else {
            input = make(field.area ? 'textarea' : 'input');
            if (field.area) input.rows = 3;
            if (field.max) input.maxLength = field.max;
            if (field.numeric) input.inputMode = 'numeric';
            if (field.url) input.inputMode = 'url';
            const inherited = isPanelOverride ? draft.global[key] : '';
            input.placeholder = spineTitleField
                ? inherited || 'Game title or https://…'
                : field.url &&
                    (!inherited ||
                        /^(preset:|blob:|data:|off$)/.test(inherited))
                  ? 'https://…'
                  : inherited || '';
        }
        input.id = id;
        if (field.url || spineTitleField) input.spellcheck = false;
        if (key === 'manual')
            input.setAttribute(
                'aria-describedby',
                scope === 'nfc' ? 'nfc-status' : 'manual-status',
            );
        if (spineTitleField) {
            input.setAttribute('aria-describedby', 'spine-title-help');
        }
        input.value = field.defaultOption
            ? value || field.defaultOption
            : field.file && /^(preset:|blob:|data:|off$)/.test(value)
              ? ''
              : value;
        input.addEventListener('input', () => {
            if (field.numeric) input.value = input.value.replace(/[^0-9]/g, '');
            if (field.color) {
                const valid =
                    !input.value || /^#[a-f0-9]{6}$/i.test(input.value);
                input.setAttribute('aria-invalid', !valid);
                if (!valid) return;
            }
            setValue(scope, key, input.value);
            if (field.file) updateImageNote();
        });

        let updateImageNote;
        if (field.color) {
            const color = make('input', {
                type: 'color',
                value: value || currentDraft().global.background || '#f7f1df',
                ariaLabel: field.label,
            });
            input.placeholder =
                scope === 'global'
                    ? '#F7F1DF'
                    : currentDraft().global.background;
            input.maxLength = 7;
            input.addEventListener('input', () => {
                if (/^#[a-f0-9]{6}$/i.test(input.value))
                    color.value = input.value;
                else if (!input.value)
                    color.value = resolved(scope, key) || '#f7f1df';
            });
            color.addEventListener('input', () => {
                input.value = color.value;
                input.setAttribute('aria-invalid', false);
                setValue(scope, key, color.value);
            });
            const group = make('span', { className: 'color' });
            group.append(color, input);
            container.append(group);
        } else {
            container.append(input);
        }

        if (field.file) {
            const note = make('span', { className: 'asset-note' });
            updateImageNote = () => {
                const source = currentDraft()[scope][key] || '';
                note.textContent =
                    source === 'preset:cover'
                        ? 'Library cover artwork'
                        : source === 'preset:screen'
                          ? 'Game screenshot'
                          : source === 'preset:spine-logo'
                            ? 'Preset spine logo'
                            : /^(blob:|data:)/.test(source)
                              ? 'Uploaded file'
                              : source === 'off'
                                ? 'Artwork hidden'
                                : !source &&
                                    isPanelOverride &&
                                    draft.global[key]
                                  ? 'Using global value'
                                  : '';
                note.hidden = !note.textContent;
            };
            const actions = make('div', { className: 'asset-actions' });
            const file = make('input', {
                type: 'file',
                accept: 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml',
                hidden: true,
            });
            const choose = make('button', {
                type: 'button',
                textContent: 'Upload file',
            });
            const hide = make('button', {
                type: 'button',
                textContent: 'Hide',
            });
            const clear = make('button', {
                type: 'button',
                textContent: isPanelOverride ? 'Use global' : 'Clear',
            });
            const updateAssetNote = updateImageNote;
            updateImageNote = () => {
                updateAssetNote();
                const source = currentDraft()[scope][key] || '';
                const inherited = isPanelOverride && draft.global[key];
                clear.hidden =
                    !source || (!isPanelOverride && source === 'off');
                hide.hidden =
                    spineTitleField ||
                    !isPanelOverride ||
                    (source || inherited) === 'off' ||
                    !(source || inherited);
            };
            updateImageNote();

            const setAsset = (source) => {
                setValue(scope, key, source);
                input.value = '';
                updateImageNote();
                input.focus();
            };
            choose.addEventListener('click', () => file.click());
            file.addEventListener('change', async () => {
                const [image] = file.files;
                file.value = '';
                if (!image) return;
                const selectedGame = game.value;
                try {
                    const source = await readImage(image);
                    if (active && game.value === selectedGame) setAsset(source);
                } catch {
                    if (active)
                        byId('form-status').textContent =
                            'Could not read the image. Please try another file.';
                }
            });
            hide.addEventListener('click', () => setAsset('off'));
            clear.addEventListener('click', () => setAsset(''));
            actions.append(file, choose, hide, clear);
            if (spineTitleField) {
                const help = make('p', {
                    id: 'spine-title-help',
                    className: 'asset-note',
                    textContent: 'Enter text or paste a direct image URL.',
                });
                container.append(help);
            }
            container.append(note, actions);
        }
        return container;
    }

    function setValue(scope, key, value) {
        const target = currentDraft()[scope];
        if (target[key] === value) return;
        if (target[key]?.startsWith('blob:')) URL.revokeObjectURL(target[key]);
        target[key] = value;
        const saved = persistDrafts();
        byId('form-status').textContent = saved
            ? ''
            : 'Changes are available this session. Browser storage is full or unavailable.';
        if (scope === 'global' && format === 'cassette') renderSide();
        render();
    }

    function renderFields(scope, container, keys) {
        container.replaceChildren(...keys.map((key) => makeField(scope, key)));
    }

    function renderSide() {
        byId('side-fields').setAttribute('aria-labelledby', 'tab-' + side);
        const { primary, secondary } = panelFields[side];
        renderFields(side, byId('side-primary'), primary);
        renderFields(side, byId('side-secondary'), secondary);
    }

    function renderForm() {
        if (format === 'nfc') {
            byId('nfc-fields').replaceChildren(
                makeField('global', 'title'),
                makeField('global', 'art'),
                makeField('nfc', 'art'),
                makeField('global', 'description'),
                makeField('nfc', 'manual'),
            );
            return;
        }
        renderFields('global', byId('global-settings'), globalArtwork);
        renderFields('global', byId('global-details'), globalDetails);
        renderSide();
    }

    function loadGame() {
        paintImage(byId('thumbnail'), data[game.value].art);
        if (!data[game.value].preset) byId('global-section').open = true;
        renderForm();
        render();
    }

    cover.addEventListener('load', () => {
        if (cover.naturalHeight)
            wrap.style.setProperty(
                '--art-ratio',
                cover.naturalWidth / cover.naturalHeight,
            );
    });
    cover.addEventListener('error', () => {
        cover.hidden = true;
        byId('art-empty').hidden = false;
    });
    spineArt.addEventListener('error', () => {
        spineArt.hidden = true;
        byId('spine-title').hidden = false;
    });
    byId('back-game-logo').addEventListener('error', () => {
        byId('back-game-logo').hidden = true;
        byId('back-title').hidden = !byId('back-title').textContent;
    });
    byId('screenshot').addEventListener('error', () => {
        byId('screenshot').hidden = true;
        byId('back-art').hidden = true;
    });

    byId('format-cassette').addEventListener('click', () =>
        setFormat('cassette'),
    );
    byId('format-nfc').addEventListener('click', () => setFormat('nfc'));
    for (const id of ['nfc-cover', 'nfc-screenshot']) {
        byId(id).addEventListener('error', () => {
            byId(id).hidden = true;
            if (id === 'nfc-cover') byId('nfc-empty').hidden = false;
            else byId('nfc-shot').hidden = true;
        });
    }

    game.addEventListener('change', () => {
        byId('form-status').textContent = '';
        loadGame();
    });
    byId('editor').addEventListener('submit', (event) =>
        event.preventDefault(),
    );
    byId('reset').addEventListener('click', () => {
        for (const settings of Object.values(currentDraft())) {
            for (const value of [
                settings.art,
                settings.title,
                settings.gameLogo,
            ]) {
                if (value?.startsWith('blob:')) URL.revokeObjectURL(value);
            }
        }
        drafts.delete(game.value);
        persistDrafts();
        loadGame();
        byId('form-status').textContent = 'Game defaults restored.';
    });
    byId('reset-side').addEventListener('click', () => {
        const draft = currentDraft();
        for (const value of [
            draft[side].art,
            draft[side].title,
            draft[side].gameLogo,
        ]) {
            if (value?.startsWith('blob:')) URL.revokeObjectURL(value);
        }
        draft[side] = freshPreset()[side];
        persistDrafts();
        renderSide();
        render();
        byId('form-status').textContent = 'Panel defaults restored.';
    });

    const sideTabs = Array.from(root.querySelectorAll('[data-side]'));
    function selectSide(button) {
        const advanced = byId('side-advanced');
        if (advanced.open) openPanelOptions.add(side);
        else openPanelOptions.delete(side);
        side = button.dataset.side;
        advanced.open = openPanelOptions.has(side);
        for (const tab of sideTabs) {
            tab.setAttribute('aria-selected', tab === button);
            tab.tabIndex = tab === button ? 0 : -1;
        }
        renderSide();
    }
    for (const button of sideTabs) {
        button.addEventListener('click', () => selectSide(button));
        button.addEventListener('keydown', (event) => {
            const offset = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
            let next;
            if (offset)
                next =
                    sideTabs[
                        (sideTabs.indexOf(button) + offset + sideTabs.length) %
                            sideTabs.length
                    ];
            else if (event.key === 'Home') next = sideTabs[0];
            else if (event.key === 'End') next = sideTabs.at(-1);
            else return;
            event.preventDefault();
            selectSide(next);
            next.focus();
        });
    }
    byId('guides').addEventListener('change', (event) =>
        wrap.setAttribute('data-fold-lines', event.target.value),
    );
    const modeButtons = root.querySelectorAll('[data-mode]');
    for (const button of modeButtons)
        button.addEventListener('click', () => {
            const isCase = button.dataset.mode === 'case';
            byId('stage').classList.toggle('case', isCase);
            byId('guides').disabled = isCase;
            for (const candidate of modeButtons)
                candidate.setAttribute('aria-pressed', candidate === button);
        });
    let titleSizer;
    if (typeof ResizeObserver !== 'undefined') {
        titleSizer = new ResizeObserver(fitNfcTitle);
        titleSizer.observe(byId('nfc-back-header'));
    }
    document.fonts?.ready.then(fitNfcTitle);
    loadGame();

    return () => {
        active = false;
        titleSizer?.disconnect();
        persistDrafts();
    };
}
