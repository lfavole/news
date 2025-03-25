var scriptURL = document.currentScript.src;

function fasthash(v) {
    // https://github.com/squidfunk/mkdocs-material/blob/74a7835/src/templates/partials/javascripts/base.html#L33
    let d = typeof v == "undefined" ? "null" : typeof v == "string" ? v : JSON.stringify(v);
    return [...d].reduce((h, c) => (h << 5) - h + c.charCodeAt(0), 0);
}

function addHiddenNews(item) {
    if(!item) return;
    try {
        var news = JSON.parse(localStorage.getItem("news") || "[]");
        news.push(fasthash(item));
        localStorage.setItem("news", JSON.stringify(news));
    } catch(e) {
        console.error("Error when adding hidden news:", e);
    }
}

function isHiddenNews(item) {
    var news = JSON.parse(localStorage.getItem("news") || "[]");
    return news.includes(fasthash(item));
}

function removeUnnecessaryNews(data) {
    var news = JSON.parse(localStorage.getItem("news") || "[]");
    var ret = [];
    for(var item of news) {
        let hash = fasthash(item);
        if(news.includes(hash)) {
            ret.push(hash);
        }
    }
    localStorage.setItem("news", JSON.stringify(ret));
}

class AttributeWatcher extends HTMLElement {
    attributeChangedCallback(name, oldValue, newValue) {
        // If the attribute has a corresponding property, update the property
        // Also avoid recursion by checking unuseful attribute changes
        if(oldValue != newValue && this.constructor.observedAttributes && this.constructor.observedAttributes.includes(name)) {
            this[name] = newValue;
        }
    }
}

class LfavoleNews extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });

        // Append styles to shadow root
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = scriptURL + "/../style.css";
        this.shadowRoot.appendChild(link);

        this.news = null;
    }

    connectedCallback() {
        var news = document.createElement("div");
        news.className = "news";
        this.shadowRoot.appendChild(news);

        // Add negative margins to make the element stick on the top, left and right of the page
        for (const side of ["Left", "Right", "Top"]) {
            const padding = window.getComputedStyle(document.body)["padding" + side] || "0px";
            const margin = window.getComputedStyle(document.body)["margin" + side] || "0px";
            news.style["margin" + side] = `calc((${padding} + ${margin}) * -1)`;
        }
    }
}

customElements.define("lfavole-news", LfavoleNews);

class LfavoleBanner extends AttributeWatcher {
    static get observedAttributes() {
        return ["banner-title", "banner-text", "banner-status", "popup-title", "popup-text", "popup-icon", "popup-link", "popup-link-text"];
    }

    constructor() {
        super();

        const bannerContent = document.createElement("div");
        bannerContent.className = "banner-content";

        const bannerTitle = document.createElement("span");
        bannerTitle.className = "banner-title";
        bannerContent.appendChild(bannerTitle);

        const bannerText = document.createElement("span");
        bannerText.className = "banner-text";
        bannerContent.appendChild(bannerText);

        const moreButton = document.createElement("button");
        moreButton.className = "banner-more";
        moreButton.textContent = "Voir plus";
        bannerContent.appendChild(moreButton);

        moreButton.addEventListener("click", () => {
            var popup = document.createElement("popup-element");
            this.parentElement.appendChild(popup);
            popup.setAttribute("popup-title", this["popup-title"]);
            popup.setAttribute("popup-text", this["popup-text"]);
            popup.setAttribute("popup-icon", this["popup-icon"]);
            popup.setAttribute("popup-link", this["popup-link"]);
            popup.setAttribute("popup-link-text", this["popup-link-text"]);
            popup.addEventListener("endclose", () => popup.remove());
        });

        const closeButton = document.createElement("button");
        closeButton.className = "banner-close";
        closeButton.textContent = "×";
        bannerContent.appendChild(closeButton);

        closeButton.addEventListener("click", () => this.hidden = true);

        this.bannerContent = bannerContent;
        this.bannerTitle = bannerTitle;
        this.bannerText = bannerText;
    }

    connectedCallback() {
        // Add banner element
        this.appendChild(this.bannerContent);
    }

    set item(item) {
        if(item && isHiddenNews(item)) {
            this.hidden = true;
        }
    }

    get "banner-title"() {
        return this.getAttribute("banner-title");
    }

    set "banner-title"(title) {
        this.setAttribute("banner-title", title);
        this.bannerTitle.textContent = title;
    }

    get "banner-text"() {
        return this.getAttribute("banner-text");
    }

    set "banner-text"(text) {
        this.setAttribute("banner-text", text);
        this.bannerText.textContent = text;
    }

    get "banner-status"() {
        return this.getAttribute("banner-status");
    }

    set "banner-status"(status) {
        this.setAttribute("banner-status", status);
    }

    get hidden() {
        return this.getAttribute("hidden");
    }

    set hidden(hidden) {
        if (hidden) {
            this.setAttribute("hidden", "");
            addHiddenNews(this.item);
        } else {
            this.removeAttribute("hidden");
        }
    }

    delete() {
        this.hidden = true;
        setTimeout(() => this.remove(), 400);
    }
}

customElements.define("lfavole-banner", LfavoleBanner);

// Inspired from https://css-tricks.com/creating-a-custom-element-from-scratch/
class PopupElement extends AttributeWatcher {
    static get observedAttributes() {
        return ["popup-icon", "popup-title", "popup-text", "popup-link", "popup-link-text"];
    }

    constructor() {
        super();

        this.addEventListener("click", () => this.hidden = true);

        var popup = document.createElement("div");
        popup.className = "popup";

        popup.addEventListener("click", (e) => e.stopPropagation());

        const closeButton = document.createElement("button");
        closeButton.className = "popup-close";
        closeButton.textContent = "×";
        popup.appendChild(closeButton);

        closeButton.addEventListener("click", () => this.hidden = true);

        const iconContainer = document.createElement("div");
        iconContainer.className = "popup-icon";
        popup.appendChild(iconContainer);

        const titleContainer = document.createElement("div");
        titleContainer.className = "popup-title";
        popup.appendChild(titleContainer);

        const textContainer = document.createElement("div");
        textContainer.className = "popup-text";
        popup.appendChild(textContainer);

        const linkButton = document.createElement("a");
        linkButton.className = "popup-link";
        linkButton.target = "_blank";
        linkButton.rel = "noreferrer";
        popup.appendChild(linkButton);

        this.popup = popup;
        this.iconContainer = iconContainer;
        this.titleContainer = titleContainer;
        this.textContainer = textContainer;
        this.linkButton = linkButton;
        this._watchEscape = this._watchEscape.bind(this);
    }

    _watchEscape(event) {
        if(event.key === "Escape") {
            this.hidden = true;
        }
    }

    connectedCallback() {
        this.appendChild(this.popup);
        this.setAttribute("role", "dialog");
        this.setAttribute("aria-hidden", "true");
        this.hidden = false;
    }

    set "popup-icon"(icon) {
        this.setAttribute("popup-icon", icon);
        this.updateIcon(icon);
    }

    set "popup-title"(title) {
        this.setAttribute("popup-title", title);
        this.titleContainer.innerHTML = title;
    }

    set "popup-text"(text) {
        this.setAttribute("popup-text", text);
        this.textContainer.innerHTML = text;
    }

    set "popup-link"(link) {
        this.setAttribute("popup-link", link);
        this.linkButton.href = link;
    }

    set "popup-link-text"(linkText) {
        this.setAttribute("popup-link-text", linkText);
        this.linkButton.innerHTML = linkText;
    }

    set hidden(hidden) {
        this.dispatchEvent(new CustomEvent(hidden ? "close" : "open"));
        if(hidden) {
            this.setAttribute("hidden", "true");
            this.style.animation = "fadeOut 0.3s forwards";
            setTimeout(() => {
                this.style.display = "none";
                this.setAttribute("aria-hidden", "true");
                this.dispatchEvent(new CustomEvent("endclose"));
            }, 300);
            document.removeEventListener("keydown", this._watchEscape);
        } else {
            this.removeAttribute("hidden");
            this.style.display = "flex";
            this.setAttribute("aria-hidden", "false");
            this.linkButton.focus();
            document.addEventListener("keydown", this._watchEscape);
        }
    }

    updateIcon(type) {
        let svgContent = '';
        switch (type) {
            case 'success':
                svgContent = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="green">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z"/>
                    </svg>
                `;
                break;
            case 'info':
                svgContent = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="blue">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-5h2v2h-2zm0-10h2v8h-2z"/>
                    </svg>
                `;
                break;
            case 'warning':
                svgContent = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="orange">
                        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                    </svg>
                `;
                break;
            case 'error':
                svgContent = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="red">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-5h2v2h-2zm0-10h2v8h-2z"/>
                    </svg>
                `;
                break;
            default:
                svgContent = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="blue">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-5h2v2h-2zm0-10h2v8h-2z"/>
                    </svg>
                `;
        }
        this.iconContainer.innerHTML = svgContent;
    }
}

customElements.define("popup-element", PopupElement);

document.addEventListener("DOMContentLoaded", function() {
    var container;

    function getContainer() {
        if(container) return container;
        container = document.createElement("lfavole-news");
        document.body.insertBefore(container, document.body.firstChild);
        return container;
    }

    fetch("https://lfavole.github.io/news/news.json")
        .then(response => response.json())
        .then(data => {
            for(var item of data) {
                const bannerElement = document.createElement("lfavole-banner");
                getContainer().shadowRoot.querySelector(".news").appendChild(bannerElement);
                bannerElement.item = item;
                // Add all keys in item to bannerElement
                for (const key in item) {
                    bannerElement.setAttribute((key.startsWith("popup-") ? "" : "banner-") + key, item[key]);
                }
            }
            removeUnnecessaryNews(data);
        })
        .catch(error => console.error("Error fetching news:", error));

    window.addNews = (bannerElement) => {
        getContainer().shadowRoot.querySelector(".news").appendChild(bannerElement);
    };
});
