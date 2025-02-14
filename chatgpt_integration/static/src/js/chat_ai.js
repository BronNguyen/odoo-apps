/** @odoo-module **/

import { registry } from "@web/core/registry";
import { formView } from "@web/views/form/form_view";
import { FormRenderer } from "@web/views/form/form_renderer";
import { useState, useRef, onWillStart, markup } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";

const WS_EVENT_TYPES = {
    DELTA: "response.audio_transcript.delta",
    DONE: "response.audio_transcript.done",
};

export class ChatAIRenderer extends FormRenderer {
    static template = "ChatAIRenderer";
    setup() {
        super.setup();
        this.inputRef = useRef("chat_input_ref");
        this.containerRef = useRef("container-ref");

        this.orm = useService("orm");
        this.rpc = useService("rpc");

        this.state = useState({
            chat_history: [], // each item: line = {message: "", is_user: true/false}
            answer_response: "",
            is_blocked: false,
            current_question: "",
        });

        this.initWebSocket().then((ws) => {
            this.ws = ws;
        });

        onWillStart(async () => this.fetchAndUpdateChatHistory());
    }

    async initWebSocket() {
        const data = await this.rpc("/chatbot/ws_information");
        const { api_url, api_key, openai_organization, openai_project, beta_protocol } = data;

        const ws = new WebSocket(api_url, [
            "realtime",
            "openai-insecure-api-key." + api_key,
            "openai-organization." + openai_organization,
            "openai-project." + openai_project,
            beta_protocol,
        ]);

        ws.onmessage = async (event) => {
            const serverEvent = JSON.parse(event.data);
            if (serverEvent.type === WS_EVENT_TYPES.DELTA) {
                this.updateAnswerResponse(serverEvent.delta);
                return;
            }

            if (serverEvent.type === WS_EVENT_TYPES.DONE) {
                await this.writeChatHistoryToBackend();
                const { chat_history } = this.state;
                chat_history.push({ message: this.state.answer_response, is_user: false });
                this.updateChatHistory(chat_history);
                this.state.is_blocked = false;
                this.resetAnswerResponse();
            }
        };

        ws.onopen = function (event) {
            console.log("Connected to server.");
        };

        return ws;
    }

    markupMessage(message) {
        return markup(message.replace(/\n/g, "<br>"));
    }

    sendWSMessage(message) {
        const event = {
            type: "response.create",
            response: {
                modalities: ["audio", "text"],
                instructions: message,
            },
        };

        this.ws.send(JSON.stringify(event));
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
        this.state.current_question = this.inputRef.el.value.trim();
        if (!this.state.current_question) return;
        this.state.is_blocked = true;

        await root._update({ text_question: this.state.current_question });
        await root.save();

        this.updateChatHistory();
        this.inputRef.el.value = "";
        this.sendWSMessage(this.state.current_question);
    }

    updateChatHistory(chat_history = false) {
        if (chat_history) {
            this.state.chat_history = chat_history;
            setTimeout(() => {
                this.scrollToBottom();
            }, 100);

            return;
        }

        chat_history = this.state.chat_history;
        chat_history.push({ message: this.state.current_question, is_user: true });
        this.state.chat_history = chat_history;
        this.scrollToBottom();
        return;
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

    async writeChatHistoryToBackend() {
        const { root } = this.env.model;
        const { answer_response } = this.state;
        await this.orm.call("ai.chat.history", "create", [
            [
                {
                    message: this.state.current_question,
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
}

const chatAIView = {
    ...formView,
    Renderer: ChatAIRenderer,
};

registry.category("views").add("chat_ai", chatAIView);
