/** @odoo-module **/

import { registry } from "@web/core/registry";
import { formView } from "@web/views/form/form_view";
import { FormRenderer } from "@web/views/form/form_renderer";
import { useState, useRef, onWillStart, markup } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";

export class ChatAIRenderer extends FormRenderer {
    static template = "ChatAIRenderer";
    setup() {
        super.setup();
        this.inputRef = useRef("chat_input_ref");
        this.containerRef = useRef("container-ref");
        this.fileInputRef = useRef("file_input_ref");

        this.orm = useService("orm");
        this.rpc = useService("rpc");

        this.state = useState({
            chat_history: [], // each item: line = {message: "", is_user: true/false}
            answer_response: "",
            is_blocked: false,
            current_question: "",
        });

        this.initHttpConnection();

        onWillStart(async () => this.fetchAndUpdateChatHistory());
    }

    onPasteImage(event) {
        event.preventDefault();
        const items = (event.clipboardData || event.originalEvent.clipboardData).items;

        for (let item of items) {
            console.log("item: ", item);
            if (item.kind === "file" && item.type.startsWith("image/")) {
                // ✅ Ensure it's an image
                const blob = item.getAsFile(); // ✅ Convert clipboard item to a Blob
                if (blob) {
                    this.resizeImageTo3KB(blob).then((imgData) => {
                        this.state.imageThumbnail = imgData;
                    });
                }
            }
        }
    }

    resizeInput() {
        const inputDiv = this.inputRef.el;
        inputDiv.style.height = "auto"; // Reset height
        inputDiv.style.height = inputDiv.scrollHeight + "px"; // Set to scroll height
    }

    async initHttpConnection() {
        const data = await this.rpc("/chatbot/http_information");
        const { api_key, openai_model, api_url } = data;
        this.httpInformation = { api_key, openai_model, api_url };
    }

    markupMessage(message) {
        return markup(message.replace(/\n/g, "<br>"));
    }

    async resizeImageTo3KB(imageFile) {
        const maxFileSize = 3 * 1024; // 3KB in bytes

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = async () => {
                    try {
                        const canvas = document.createElement("canvas");
                        const ctx = canvas.getContext("2d");
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx.drawImage(img, 0, 0);

                        let base64JPEG = canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
                        let base64Size = (base64JPEG.length * 3) / 4; // Approximate size in bytes

                        // If image is larger than 3KB, resize it
                        if (base64Size > maxFileSize) {
                            let width = img.width,
                                height = img.height;
                            const maxWidth = 800,
                                maxHeight = 600;

                            if (width > maxWidth || height > maxHeight) {
                                const ratio = Math.min(maxWidth / width, maxHeight / height);
                                width = Math.round(width * ratio);
                                height = Math.round(height * ratio);
                            }

                            canvas.width = width;
                            canvas.height = height;
                            ctx.clearRect(0, 0, width, height); // Clear canvas before drawing
                            ctx.drawImage(img, 0, 0, width, height);

                            let quality = 0.8;
                            base64JPEG = canvas.toDataURL("image/jpeg", quality).split(",")[1];
                            base64Size = (base64JPEG.length * 3) / 4;

                            // Reduce quality until size is under 3KB
                            while (base64Size > maxFileSize && quality > 0.2) {
                                quality -= 0.1;
                                base64JPEG = canvas.toDataURL("image/jpeg", quality).split(",")[1];
                                base64Size = (base64JPEG.length * 3) / 4;
                            }
                        }

                        // ✅ Upload to Odoo & Update `img_url` but do not resolve it
                        this.uploadToOdoo(base64JPEG).then((imageUrl) => {
                            this.state.img_url = imageUrl;
                        });

                        // ✅ Resolve Base64 string instead of the image URL
                        resolve(`data:image/jpeg;base64,${base64JPEG}`);
                    } catch (error) {
                        reject(error);
                    }
                };

                img.onerror = () => reject(new Error("Image loading failed"));
                img.src = e.target.result; // Set `src` after defining `onload`
            };

            reader.onerror = () => reject(new Error("File reading failed"));
            reader.readAsDataURL(imageFile);
        });
    }

    async sendMessageWithInstruction(message) {
        const { api_key, openai_model, api_url, system_prompt } = this.httpInformation;
        const model = this.state.imageThumbnail ? "gpt-4o-mini" : openai_model;

        const response = await fetch(api_url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${api_key}`,
            },
            body: this.getChatGPTRequestBody(message, model, system_prompt),
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                await this.onStreamingFinished();
                break;
            }

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n").filter((line) => line.trim() !== "");

            for (const line of lines) {
                if (line.startsWith("data:")) {
                    const json = line.replace("data: ", "");
                    if (json === "[DONE]") {
                        await this.onStreamingFinished();
                        return;
                    }

                    try {
                        const parsed = JSON.parse(json);
                        const text = parsed.choices[0]?.delta?.content || "";

                        // update answer response
                        this.updateAnswerResponse(text);
                    } catch (error) {
                        console.error("Error parsing JSON:", error);
                    }
                }
            }
        }
    }

    async uploadToOdoo(base64Image, fileName = "uploaded_image.jpg") {
        const odooUrl = "/web/dataset/call_kw";
        const payload = {
            jsonrpc: "2.0",
            method: "call",
            params: {
                model: "ir.attachment",
                method: "create_unique",
                args: [
                    [
                        {
                            name: fileName.replace(/\.webp$/, ".jpg"),
                            description: "format: jpeg",
                            datas: base64Image, // ✅ Send only valid base64
                            mimetype: "image/jpeg",
                        },
                    ],
                ],
                kwargs: {},
            },
            id: new Date().getTime(),
        };

        const response = await fetch(odooUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Requested-With": "XMLHttpRequest",
            },
            body: JSON.stringify(payload),
            credentials: "include",
        });

        const data = await response.json();
        console.log("Odoo Response:", data); // ✅ Debugging

        if (data.result && data.result.length > 0) {
            return `/web/image/${data.result[0]}`;
        } else {
            throw new Error("Failed to upload image: " + JSON.stringify(data.error));
        }
    }

    getChatGPTRequestBody(message, model, system_prompt = "", function_call = false) {
        const messages = [];

        if (system_prompt) {
            messages.push({
                role: "system",
                content: system_prompt,
            });
        }

        const userContent = [{ type: "text", text: message }];

        if (this.state.img_url) {
            const odooBaseURL = window.location.origin;
            const url = odooBaseURL + this.state.img_url;
            userContent.push({
                type: "image_url",
                image_url: { url },
            });
        }

        messages.push({
            role: "user",
            content: userContent,
        });

        const bodyObject = {
            model: model,
            messages,
            stream: true,
        };

        if (function_call) {
            bodyObject.functions = [
                {
                    name: "processObjects",
                    description: "Processes the objects identified in an image.",
                    parameters: {
                        type: "object",
                        properties: {
                            objects: {
                                type: "array",
                                items: { type: "string" },
                                description: "List of objects detected in the image",
                            },
                        },
                        required: ["objects"],
                    },
                },
            ];
            bodyObject.function_call = "auto";
            bodyObject.max_tokens = 500;
        }

        return JSON.stringify(bodyObject);
    }


    async onStreamingFinished() {
        await this.writeChatHistoryToBackend();
        const { chat_history } = this.state;
        chat_history.push({ message: this.state.answer_response, is_user: false });
        this.updateChatHistory(chat_history);
        this.state.is_blocked = false;
        this.resetAnswerResponse();
    }

    scrollToBottom() {
        if (!this.containerRef.el) return;

        this.containerRef.el.scrollTop = this.containerRef.el.scrollHeight;
    }

    updateAnswerResponse(text) {
        this.state.answer_response += text;
    }

    resetAnswerResponse() {
        this.state.answer_response = "";
        this.state.current_question = "";
    }

    async onSendQuestion() {
        const { root } = this.env.model;
        this.state.current_question = this.inputRef.el.textContent.trim();
        this.state.current_question += "\n";

        if (!this.state.current_question) return;
        this.state.is_blocked = true;
        await root._update({ text_question: this.state.current_question });
        await root.save();

        this.updateChatHistory();
        this.sendMessage(this.state.current_question).then(() => {
            this.onRemoveImage();
        });
    }

    updateChatHistory(chat_history = false) {
        if (this.inputRef.el?.textContent) this.inputRef.el.textContent = "";

        if (chat_history) {
            this.state.chat_history = chat_history;
            setTimeout(() => {
                this.scrollToBottom();
            }, 100);

            return;
        }

        chat_history = this.state.chat_history;
        chat_history.push({ message: this.getCurrentQuestion(), is_user: true });
        this.state.chat_history = chat_history;
        this.scrollToBottom();
        return;
    }

    async sendMessage(message) {
        if (this.httpInformation) {
            await this.sendMessageWithInstruction(message);
            return;
        }

        console.error("No connection established.");
    }

    async fetchAndUpdateChatHistory() {
        const { root } = this.env.model;
        const chat_history_ids = root.data.chat_history_ids;
        const chat_history = await this.orm.call("ai.chat.history", "search_read", [
            [["id", "in", chat_history_ids._currentIds]],
            ["message", "is_user"],
        ]);

        this.updateChatHistory(chat_history);
    }

    getCurrentQuestion() {
        const imageHtml = this.state.imageThumbnail
            ? `<img src="${this.state.imageThumbnail}" alt="Image" style="max-width: 100px; max-height: 100px; object-fit: cover;"/>`
            : "";
        return this.state.current_question + imageHtml;
    }

    async writeChatHistoryToBackend() {
        const { root } = this.env.model;
        const { answer_response } = this.state;
        await this.orm.call("ai.chat.history", "create", [
            [
                {
                    message: this.getCurrentQuestion(),
                    is_user: true,
                    chat_id: root.resId,
                },
                {
                    message: answer_response,
                    is_user: false,
                    chat_id: root.resId,
                },
            ],
        ]);
    }

    onRemoveImage() {
        this.state.imageThumbnail = false;
        this.state.img_url = "";
    }

    onFileUploadClick() {
        this.fileInputRef.el.click();
    }

    async onFileChange(event) {
        const file = event.target.files[0];
        if (file) {
            try {
                const imgData = await this.resizeImageTo3KB(file); // Wait for the resized image
                this.state.imageThumbnail = imgData;
            } catch (error) {
                console.error("Error resizing image:", error);
            }
        }
    }
}

const chatAIView = {
    ...formView,
    Renderer: ChatAIRenderer,
};

registry.category("views").add("chat_ai", chatAIView);
