const fs = require('fs');

const path = 'c:/Users/samki/KookminUni_Architecture_Portal/src/pages/LoginPage.jsx';
const outPath = 'c:/Users/samki/KookminUni_Architecture_Portal/src/pages/LoginPage_fixed.jsx';
let content = fs.readFileSync(path, 'utf8');

function extractBlock(startMarker, endMarker) {
    const startIdx = content.indexOf(startMarker);
    if (startIdx === -1) return '';
    let endIdx = -1;
    if (endMarker) {
        const nextStartIdx = content.indexOf(endMarker, startIdx);
        if (nextStartIdx !== -1) {
            endIdx = nextStartIdx;
        }
    }

    if (endIdx === -1) return '';

    const block = content.substring(startIdx, endIdx);
    content = content.substring(0, startIdx) + content.substring(endIdx);
    return block;
}

// 1. Remove Top Left User Guide
extractBlock('{/* Top Left - User Guide & Notices', '{/* Main Container');

// 2. Extract Exhibition Poster
const exhibitionBlock = extractBlock('{/* Exhibition Poster - Right Side */}', '{/* Background Logo */}');

// 3. Extract Background Logo
let bgLogoBlock = extractBlock('{/* Background Logo */}', '{/* Mobile Guide Panel */}');
// In case "Mobile Guide Panel" is not right after due to my previous edits, let's just find the next known marker.
if (!bgLogoBlock) {
    bgLogoBlock = extractBlock('{/* Background Logo */}', '<div className="fade-in"');
}
if (bgLogoBlock) {
    // Fix background logo position
    bgLogoBlock = bgLogoBlock.replace(/position:\s*"absolute",\s*top:\s*"50%",\s*left:\s*"50%",\s*transform:\s*"translate\(-50%, -50%\)",/, 'position: "fixed", bottom: -50, right: -50,');
}

// 4. Extract Mobile Guide Panel
const mobileGuideBlock = extractBlock('{/* Mobile Guide Panel */}', '{/* Header */}');

// 5. Extract Header
let headerBlock = extractBlock('{/* Header */}', '{/* Role Switch */}');
if (headerBlock.includes('{/* Role Switch */}')) {
    // Wait, if it didn't find the end marker, it returns nothing.
}

// 6. Extract Old Quick Links from Right Panel
const rightPanelStart = content.indexOf('{/* Right Panel (Form area) */}');
const bannerTitleStart = content.indexOf('{/* Banner Title */}');
const roleSwitchStart = content.indexOf('{/* Role Switch */}');

let quickLinksBlock = '';
if (bannerTitleStart > rightPanelStart && bannerTitleStart < roleSwitchStart) {
    quickLinksBlock = content.substring(bannerTitleStart, roleSwitchStart);
    content = content.substring(0, bannerTitleStart) + content.substring(roleSwitchStart);
}

// 7. Inject everything back to correct places

// A. Quick links back to Left Panel
const leftQuickLinksMarker = '{/* Quick Links inside left panel */}';
const rightPanelMarker = '{/* Right Panel (Form area) */}';
const leftLinkStart = content.indexOf(leftQuickLinksMarker);
const rpStart = content.indexOf(rightPanelMarker);

if (leftLinkStart !== -1 && leftLinkStart < rpStart && quickLinksBlock) {
    // Replace the circular links with the vertical links

    // Strip out old fixed positioning from quickLinksBlock
    let cleanQuickLinks = quickLinksBlock
        .replace(/transform:\s*`translateY\(-50%\) scale\(\$\{loginScale\}\)`,/g, '')
        .replace(/position:\s*"fixed",/g, 'position: "relative",')
        .replace(/left:\s*20,/g, '')
        .replace(/top:\s*"50%",/g, '');

    let leftPanelReplacement = `
          {/* Quick Links inside left panel */}
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10, width: "100%", zIndex: 10 }}>
            ${cleanQuickLinks}
          </div>
        </div>

        `;

    content = content.substring(0, leftLinkStart) + leftPanelReplacement + content.substring(rpStart);
}

// B. Inject Exhibition Poster and Background Logo AT THE END of the main flex container
// Look for `{/* Safety Certificate Upload Modal */}` which is after the main container ends.
const splitEndMarker = '{/* Safety Certificate Upload Modal */}';
const splitEndIdx = content.indexOf(splitEndMarker);

if (splitEndIdx !== -1) {
    // go backwards to find the closing tags of the main container
    const rev = content.substring(0, splitEndIdx);
    const insertIdx = rev.lastIndexOf('</div>\n      </div>');

    if (insertIdx !== -1) {
        const endInsertIdx = insertIdx + 14;
        content = content.substring(0, endInsertIdx) + `\n\n      ${exhibitionBlock}\n      ${bgLogoBlock}\n` + content.substring(endInsertIdx);
    }
}

// C. Re-inject Header and Mobile Guide into the Right Panel BEFORE Role Switch
const roleSwitchMarker = '{/* Role Switch */}';
const rsIdx = content.indexOf(roleSwitchMarker);
if (rsIdx !== -1) {
    // Remove the '{/* Main Login Section */} <div>' wrapper that got left behind
    content = content.replace(/\{\/\* Main Login Section \*\/}\s*<div.*?>\s*/, '');

    content = content.substring(0, rsIdx) + `${mobileGuideBlock}\n          ${headerBlock}\n          ` + content.substring(rsIdx);
}

fs.writeFileSync(path, content);
console.log('Refactor script completed successfully.');
