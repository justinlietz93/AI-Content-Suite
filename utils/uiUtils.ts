
const copyIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5 mr-1 inline-block"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 8.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v8.25A2.25 2.25 0 006 16.5h2.25m8.25-8.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-7.5A2.25 2.25 0 018.25 18v-1.5m8.25-8.25h-6a2.25 2.25 0 00-2.25 2.25v6" /></svg> Copy`;
const checkIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5 mr-1 inline-block text-green-400"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Copied!`;

/**
 * Finds all <pre> elements within a container, extracts the code language,
 * and appends a "Copy" button.
 * @param containerElement The parent element whose children will be scanned.
 */
export const enhanceCodeBlocks = (containerElement: HTMLElement | null) => {
    if (!containerElement) return;

    containerElement.querySelectorAll('pre').forEach(preEl => {
        if (preEl.querySelector('.copy-code-button')) return; // Already enhanced

        const codeEl = preEl.querySelector('code');
        const langMatch = codeEl?.className.match(/language-(\w+)/);
        const lang = langMatch ? langMatch[1] : 'text';
        preEl.setAttribute('data-lang', lang);

        const button = document.createElement('button');
        button.className = 'copy-code-button';
        button.innerHTML = copyIconSvg;
        button.setAttribute('aria-label', 'Copy code to clipboard');
        
        button.onclick = () => {
            if (codeEl) {
                navigator.clipboard.writeText(codeEl.innerText).then(() => {
                    button.innerHTML = checkIconSvg;
                    setTimeout(() => {
                        button.innerHTML = copyIconSvg;
                    }, 2000);
                }).catch(err => {
                    console.error("Failed to copy code: ", err);
                    button.textContent = "Error";
                });
            }
        };
        preEl.appendChild(button);
    });
};