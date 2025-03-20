/** @odoo-module **/

import { registry } from "@web/core/registry";
import { Many2ManyBinaryField } from "@web/views/fields/many2many_binary/many2many_binary_field";
import { checkFileSize } from "@web/core/utils/files";
import { useService } from "@web/core/utils/hooks";
import { useState, onWillUpdateProps } from "@odoo/owl";

export class MultipleAttachmentPreview extends Many2ManyBinaryField {
    static template = "draggable_m2m_attachment_preview.MultipleAttachmentPreview";

    setup() {
        super.setup();
        this.http = useService("http");
        this.state = useState({
            isDragging: false,
            files: [],
        });

        this.getFilesValue();

        onWillUpdateProps((_) => {
            this.getFilesValue();
        });
    }

    get fileIds() {
        return this.props.record.data[this.props.name].records.map((record) => record.resId);
    }

    handleDragOver(event) {
        event.preventDefault();
        this.state.isDragging = true;
    }

    handleDragLeave(event) {
        event.preventDefault();
        this.state.isDragging = false;
    }

    onViewAttachment(file) {
        if (this.isImageType(file)) {
            this._previewImage(file.id);
            return;
        }

        if (file.mimetype === "application/pdf") {
            this._previewPDF(file.id);
            return;
        }

        this._downloadFile(file.id);
    }

    isImageType(file) {
        const imageMimeTypes = [
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/bmp",
            "image/webp",
            "image/tiff",
            "image/svg+xml",
            "image/x-icon",
            "image/heif",
            "image/heic",
            "image/vnd.microsoft.icon",
            "image/avif",
        ];
        return imageMimeTypes.includes(file.mimetype);
    }

    _downloadFile(fileSrc) {
        const anchorEl = document.createElement("a");
        anchorEl.href = this.getUrl(fileSrc);
        document.body.appendChild(anchorEl);
        anchorEl.click();
        document.body.removeChild(anchorEl);
    }

    get resId() {
        return this.props.record?.resId;
    }

    async getFilesValue() {
        if (!this.resId) return [];

        const files = await this.orm.call("ir.attachment", "search_read", [
            [["res_id", "=", this.resId]],
        ]);

        this.state.files = files.filter((file) => this.fileIds.includes(file.id));
    }

    async onFileRemove(deleteId) {
        await super.onFileRemove(deleteId);
        const files = this.state.files.filter((file) => this.fileIds.includes(file.id));
        this.state.files = files;
    }

    async handleFileDrop(event) {
        this.handleDragLeave(event);

        event.preventDefault();
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            const result = await this.uploadFiles(files);
            this.onFileUploaded(result);
        }
    }

    async onFileUploaded(files) {
        await super.onFileUploaded(files);
        const filesData = files.map((file) => {
            return {
                id: file.id,
                name: file.filename,
                mimetype: file.mimetype,
                size: file.size,
            };
        });
        this.state.files = [...this.state.files, ...filesData];
    }

    _previewImage(imgSrc) {
        let imgName = "";
        const modalHtml = `
            <div class="modal-img">
                <div class="row">
                    <div class="col"></div>
                    <div style="text-align:right;" class="col">
                        <span style="margin-left:auto;">
                            <a id="OrderImgDownloadLink" href="/web/content/${imgSrc}" download="/web/content/${imgName}">
                                <i class="fa fa-fw fa-download" style="color:#ffffffdb !important;" role="img" aria-label="Download"></i>
                                <span style="color:#ffffffdb !important;">Download</span>
                            </a>
                            <a style="color:#ffffffdb !important;margin-left:15px;" class="close-img">&times;</a>
                        </span>
                    </div>
                </div>
                <div class="row modal-img-m2m" style="height:90%;">
                    <img class="preview-img-order" id="m2m-zoom-image" src="/web/content/${imgSrc}"/>
                </div>
                <div class="row m2m-zoom-buttons">
                    <div class="col-12" style="text-align:center;">
                        <button title="Zoom In" id="m2m-zoom-in">
                            <i class="fa fa-fw fa-plus" role="img" aria-label="Zoom In"></i>
                        </button>
                        <button title="Zoom Out" id="m2m-zoom-out">
                            <i class="fa fa-fw fa-minus" role="img" aria-label="Zoom Out"></i>
                        </button>
                        <a href="/web/content/${imgSrc}" download="/web/content/${imgName}">
                            <button title="Download" id="m2m-download-btn">
                                <i class="fa fa-fw fa-download" role="img" aria-label="Download"></i>
                            </button>
                        </a>
                        <a target="_blank" href="/web/content/${imgSrc}">
                            <button title="Open in New Tab" id="m2m-download-btn">
                                <i class="fa fa-fw fa-external-link" role="img" aria-label="Open in New Tab"></i>
                            </button>
                        </a>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML("beforeend", modalHtml);
        document.querySelector(".modal-img").style.display = "block";
        document.querySelector(".close-img").addEventListener("click", function () {
            document.querySelector(".modal-img").remove();
        });
        document.querySelector(".modal-img").addEventListener("click", function (event) {
            if (event.target.classList.contains("modal-img-m2m")) {
                document.querySelector(".modal-img").remove();
            }
        });

        let zoomValue = 100;
        let zoomIncrement = 10;
        let minZoom = 50;
        let maxZoom = 200;
        let zoomImage = document.getElementById("m2m-zoom-image");
        let zoomInButton = document.getElementById("m2m-zoom-in");
        let zoomOutButton = document.getElementById("m2m-zoom-out");

        function updateZoomLevel() {
            zoomImage.style.transform = "scale(" + zoomValue / 100 + ")";
        }
        function handleZoomIn() {
            if (zoomValue < maxZoom) {
                zoomValue += zoomIncrement;
                updateZoomLevel();
            }
        }
        function handleZoomOut() {
            if (zoomValue > minZoom) {
                zoomValue -= zoomIncrement;
                updateZoomLevel();
            }
        }
        zoomInButton.addEventListener("click", handleZoomIn);
        zoomOutButton.addEventListener("click", handleZoomOut);
    }

    processFileName(fileName) {
        if (fileName.length > 13) {
            return fileName.substring(0, 13) + "..." + fileName.replace(/^.*\./, "");
        }
        return fileName;
    }

    async _previewPDF(fileSrc) {
        let fileName = "";
        let totalPageCount = 0;

        let modalHtml = `
            <div class="modal-pdf modal-img">
                <div class="row">
                    <div style="text-align:center;" class="col-12">
                        <span id="pageCount" style="line-height:40px;color:#ffffffdb !important;">
                            ${totalPageCount} Page
                        </span>
                        <span style="float:right;">
                            <a id="OrderPdfDownloadLink" href="/web/content/${fileSrc}" download="/web/content/${fileName}">
                                <i class="fa fa-fw fa-download" style="color:#ffffffdb !important;" role="img" aria-label="Download"></i>
                                <span style="color:#ffffffdb !important;">Download</span>
                            </a>
                            <a style="color:#ffffffdb !important;margin-left:15px;" class="close-pdf">&times;</a>
                        </span>
                    </div>
                </div>
                <div class="pdf-container">
                    <div id="pdfCanvasContainer"></div>
                </div>
                <div style="position:fixed;bottom:30px;" class="row m2m-zoom-buttons">
                    <div class="col-12" style="text-align:center;">
                        <button title="Zoom In" id="m2m-zoom-in">
                            <i class="fa fa-fw fa-plus" role="img" aria-label="Zoom In"></i>
                        </button>
                        <button title="Zoom Out" id="m2m-zoom-out">
                            <i class="fa fa-fw fa-minus" role="img" aria-label="Zoom Out"></i>
                        </button>
                        <a href="/web/content/${fileSrc}" download="/web/content/${fileSrc}">
                            <button title="Download" id="m2m-download-btn">
                                <i class="fa fa-fw fa-download" role="img" aria-label="Download"></i>
                            </button>
                        </a>
                        <button title="Print" id="m2m-print-pdf">
                            <i class="fa fa-fw fa-print" role="img" aria-label="Print"></i>
                        </button>
                        <a href="/web/content/${fileSrc}" target="_blank">
                            <button title="Open in New Tab" id="m2m-download-btn">
                                <i class="fa fa-fw fa-external-link" role="img" aria-label="Open in New Tab"></i>
                            </button>
                        </a>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML("beforeend", modalHtml);
        document.querySelector(".modal-pdf").style.display = "block";

        let pdfjsLib = window["pdfjs-dist/build/pdf"];
        pdfjsLib.GlobalWorkerOptions.workerSrc = "./lib/pdf.worker.min.js";
        let pdfCanvasContainer = document.getElementById("pdfCanvasContainer");

        try {
            let pdf = await pdfjsLib.getDocument("/web/content/" + fileSrc).promise;
            totalPageCount = pdf.numPages;
            document.getElementById("pageCount").textContent = totalPageCount + " Page";

            for (let pageNum = 1; pageNum <= totalPageCount; pageNum++) {
                let page = await pdf.getPage(pageNum);
                let viewport = page.getViewport({ scale: 1 });
                let canvas = document.createElement("canvas");
                canvas.className = "pdf-page-canvas";
                pdfCanvasContainer.appendChild(canvas);
                let context = canvas.getContext("2d");
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({ canvasContext: context, viewport: viewport }).promise;
                pdfCanvasContainer.appendChild(document.createElement("br"));
            }
        } catch (error) {
            console.error("Error:", error);
        }

        document.querySelector(".close-pdf").addEventListener("click", function () {
            document.querySelector(".modal-pdf").remove();
        });

        document.querySelector(".modal-pdf").addEventListener("click", function (event) {
            if (event.target.classList.contains("modal-pdf")) {
                document.querySelector(".modal-pdf").remove();
            }
        });

        document.addEventListener("click", function (event) {
            if (!event.target.closest("#pdfCanvas") && event.target.tagName === "DIV") {
                document.querySelector(".modal-pdf").remove();
            }
        });

        let zoomValue = 100;
        let zoomIncrement = 10;
        let minZoom = 50;
        let marTop = 10;
        let maxZoom = 200;
        let zoomImage = document.getElementById("pdfCanvasContainer");
        let zoomInButton = document.getElementById("m2m-zoom-in");
        let zoomOutButton = document.getElementById("m2m-zoom-out");
        let printButton = document.getElementById("m2m-print-pdf");

        function updateZoomLevel() {
            zoomImage.style.transform = "scale(" + zoomValue / 100 + ")";
        }
        function handleZoomIn() {
            if (zoomValue < maxZoom) {
                marTop = marTop + 10;
                zoomValue += zoomIncrement;
                updateZoomLevel();
                zoomImage.style.marginTop = marTop.toString() + "%";
            }
        }
        function handleZoomOut() {
            if (zoomValue > minZoom) {
                marTop = marTop - 10;
                zoomValue -= zoomIncrement;
                updateZoomLevel();
                zoomImage.style.marginTop = marTop.toString() + "%";
            }
        }
        zoomInButton.addEventListener("click", handleZoomIn);
        zoomOutButton.addEventListener("click", handleZoomOut);
        printButton.addEventListener("click", printPDF);

        function printPDF() {
            let url = "/web/content/" + fileSrc;
            const iframe = document.createElement("iframe");
            iframe.src = url;
            iframe.style.display = "none";
            document.body.appendChild(iframe);
            iframe.onload = () => {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            };
        }
    }

    async uploadFiles(files) {
        const { resModel } = this.env.model.root;

        const params = {
            csrf_token: odoo.csrf_token,
            ufile: Array.from(files),
            model: resModel,
            id: this.resId || 0,
        };

        const fileSize = files[0]?.size;
        if (!checkFileSize(fileSize, this.notification)) return null;

        const fileData = await this.http.post("/web/binary/upload_attachment", params, "text");
        const parsedFileData = JSON.parse(fileData);
        if (parsedFileData.error) {
            throw new Error(parsedFileData.error);
        }
        return parsedFileData;
    }
}

export const multipleAttachmentPreview = {
    ...Many2ManyBinaryField,
    component: MultipleAttachmentPreview,
};

registry.category("fields").add("draggable_m2m_attachment_field", multipleAttachmentPreview);
