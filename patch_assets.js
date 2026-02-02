const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public/premium-rsvp/assets/index-BK-nu97X.js');

try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Check if targets exist
    const target1 = '/admin/premium-invitation-preview';
    const target2 = '/admin/premium-invitation';

    if (!content.includes(target1) && !content.includes(target2)) {
        console.log('Targets not found. Maybe already patched?');
        // Let's print what we see around where we expect them if possible, or just exit.
    } else {
        console.log('Targets found. Patching...');
    }

    // Replace strict matches. Using global replacement just in case.
    // Replace longest first to avoid substring replacement issues.
    const patch1 = '/premium-rsvp/index.html#/invite/premium';
    const patch2 = '/premium-rsvp/index.html#/admin/premium-invitation';

    // Regex escaping not strictly needed for these simple paths but good practice if chars weird
    // Just using split/join for global replace simple behavior

    const newContent = content.split(target1).join(patch1).split(target2).join(patch2);

    if (content === newContent) {
        console.log('No changes made.');
    } else {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log('Successfully patched file.');
    }

} catch (error) {
    console.error('Error patching file:', error);
    process.exit(1);
}
