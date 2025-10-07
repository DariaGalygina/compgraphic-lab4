class Polygon {
    constructor(id) {
        this.id = id;
        this.vertices = [];
        this.color = this.getRandomColor();
        this.completed = false;
    }
    
    getRandomColor() {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    containsPoint(x, y) {
        if (this.vertices.length < 3) return false;
        
        let inside = false;
        for (let i = 0, j = this.vertices.length - 1; i < this.vertices.length; j = i++) {
            const xi = this.vertices[i].x, yi = this.vertices[i].y;
            const xj = this.vertices[j].x, yj = this.vertices[j].y;
            
            if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    }
    
    classifyPointToEdge(point, edgeStart, edgeEnd) {
        const dx = edgeEnd.x - edgeStart.x;
        const dy = edgeEnd.y - edgeStart.y;
        const px = point.x - edgeStart.x;
        const py = point.y - edgeStart.y;
        const cross = dx * py - dy * px;
        
        return cross > 0 ? 'left' : cross < 0 ? 'right' : 'on';
    }
    
    getCenter() {
        if (this.vertices.length === 0) return { x: 0, y: 0 };
        
        let sumX = 0, sumY = 0;
        for (let vertex of this.vertices) {
            sumX += vertex.x;
            sumY += vertex.y;
        }
        return {
            x: sumX / this.vertices.length,
            y: sumY / this.vertices.length
        };
    }
    
    applyTransformation(matrix) {
        for (let i = 0; i < this.vertices.length; i++) {
            const vertex = this.vertices[i];
            const x = vertex.x * matrix[0][0] + vertex.y * matrix[0][1] + matrix[0][2];
            const y = vertex.x * matrix[1][0] + vertex.y * matrix[1][1] + matrix[1][2];
            this.vertices[i] = { x, y };
        }
    }
    
    translate(dx, dy) {
        const translationMatrix = [
            [1, 0, dx],
            [0, 1, dy]
        ];
        this.applyTransformation(translationMatrix);
    }
    
    rotateAroundPoint(cx, cy, angleDeg) {
        const angleRad = angleDeg * Math.PI / 180;
        const cosA = Math.cos(angleRad);
        const sinA = Math.sin(angleRad);
        
        const rotationMatrix = [
            [cosA, -sinA, cx - cx * cosA + cy * sinA],
            [sinA, cosA, cy - cx * sinA - cy * cosA]
        ];
        this.applyTransformation(rotationMatrix);
    }
    
    rotateAroundCenter(angleDeg) {
        const center = this.getCenter();
        this.rotateAroundPoint(center.x, center.y, angleDeg);
    }
    
    draw(ctx, highlight = false, edgeCheck = null, selected = false) {
        if (this.vertices.length === 0) return;
        
        ctx.save();
        
       
        if (selected) {
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 4;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
            for (let i = 1; i < this.vertices.length; i++) {
                ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
            }
            if (this.completed && this.vertices.length > 2) {
                ctx.closePath();
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        ctx.strokeStyle = highlight ? '#FF0000' : this.color;
        ctx.lineWidth = highlight ? 4 : 2;
        ctx.fillStyle = this.color + (highlight ? '80' : '40');
        
        ctx.beginPath();
        ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
        for (let i = 1; i < this.vertices.length; i++) {
            ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
        }
        
        if (this.completed && this.vertices.length > 2) {
            ctx.closePath();
            ctx.fill();
        }
        ctx.stroke();
        
        ctx.fillStyle = highlight ? '#FF0000' : this.color;
        for (let vertex of this.vertices) {
            ctx.beginPath();
            ctx.arc(vertex.x, vertex.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        if (this.completed && this.vertices.length >= 3) {
            const center = this.getCenter();
            ctx.fillStyle = '#000';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.id.toString(), center.x, center.y);
            ctx.textAlign = 'left';
        }
        
        if (edgeCheck && this.vertices[edgeCheck.edgeIndex]) {
            const i = edgeCheck.edgeIndex;
            const j = (i + 1) % this.vertices.length;
            const start = this.vertices[i];
            const end = this.vertices[j];
            
            ctx.strokeStyle = '#FFA500';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
            
            if (edgeCheck.point) {
                const position = this.classifyPointToEdge(edgeCheck.point, start, end);
                ctx.fillStyle = '#000';
                ctx.font = '14px Arial';
                ctx.fillText(position === 'left' ? 'Слева' : position === 'right' ? 'Справа' : 'На линии', 
                           edgeCheck.point.x + 10, edgeCheck.point.y - 10);
            }
        }
        
        ctx.restore();
    }
}

class PolygonApp {
    constructor() {
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.polygons = [];
        this.currentPolygon = null;
        this.checkMode = false;
        this.edgeCheckMode = false;
        this.selectMode = false;
        this.testPoint = null;
        this.highlightedPolygons = [];
        this.edgeCheckData = null;
        this.selectedPolygonId = -1;
        this.polygonCounter = 1;
        
        this.resizeCanvas();
        this.setupEvents();
        this.updateUI();
        this.draw();
    }
    
    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = 600;
    }
    
    setupEvents() {
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.draw();
        });
        
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        
        const buttons = ['newPolygon', 'clearAll', 'completePolygon', 'deleteLast', 'checkPoint', 'checkEdge', 'selectPolygon'];
        buttons.forEach(id => {
            document.getElementById(id).addEventListener('click', () => this[id]());
        });
        
        document.getElementById('translate-polygon').addEventListener('click', () => this.translatePolygon());
        document.getElementById('rotate-polygon').addEventListener('click', () => this.rotatePolygon());
        document.getElementById('rotate-polygon-center').addEventListener('click', () => this.rotatePolygonAroundCenter());
    }
    
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
            y: (e.clientY - rect.top) * (this.canvas.height / rect.height)
        };
    }
    
    handleClick(e) {
        const pos = this.getMousePos(e);
        if (pos.x < 0 || pos.x > this.canvas.width || pos.y < 0 || pos.y > this.canvas.height) return;
        
        if (this.checkMode) {
            this.testPoint = pos;
            this.highlightedPolygons = this.polygons.filter(p => 
                p.completed && p.vertices.length >= 3 && p.containsPoint(pos.x, pos.y)
            );
            this.edgeCheckData = null;
        } else if (this.edgeCheckMode) {
            this.testPoint = pos;
            this.checkEdgeForPoint();
        } else if (this.selectMode) {
            this.selectPolygonAtPoint(pos);
        } else {
            if (this.currentPolygon) {
                this.currentPolygon.vertices.push(pos);
            }
        }
        this.updateUI();
        this.draw();
    }
    
    selectPolygonAtPoint(pos) {
       
        for (let i = this.polygons.length - 1; i >= 0; i--) {
            const polygon = this.polygons[i];
            if (polygon.completed && polygon.vertices.length >= 3 && polygon.containsPoint(pos.x, pos.y)) {
                this.selectedPolygonId = polygon.id;
                this.updateSelectionInfo();
                return;
            }
        }
        
        if (this.currentPolygon && this.currentPolygon.vertices.length >= 3 && this.currentPolygon.containsPoint(pos.x, pos.y)) {
            this.selectedPolygonId = this.currentPolygon.id;
        } else {
            this.selectedPolygonId = -1;
        }
        this.updateSelectionInfo();
    }
    
    checkEdgeForPoint() {
        if (!this.testPoint) return;
        
        let minDistance = Infinity;
        let closestEdge = null;
        
        for (let polygon of this.polygons) {
            if (!polygon.completed || polygon.vertices.length < 2) continue;
            
            for (let i = 0; i < polygon.vertices.length; i++) {
                const j = (i + 1) % polygon.vertices.length;
                const start = polygon.vertices[i];
                const end = polygon.vertices[j];
                
                const dx = end.x - start.x;
                const dy = end.y - start.y;
                const t = ((this.testPoint.x - start.x) * dx + (this.testPoint.y - start.y) * dy) / (dx * dx + dy * dy);
                const closest = t < 0 ? start : t > 1 ? end : {
                    x: start.x + t * dx,
                    y: start.y + t * dy
                };
                const distance = Math.hypot(this.testPoint.x - closest.x, this.testPoint.y - closest.y);
                
                if (distance < minDistance) {
                    minDistance = distance;
                    closestEdge = { polygon, edgeIndex: i, point: this.testPoint };
                }
            }
        }
        
        this.edgeCheckData = closestEdge;
    }
    
    newPolygon() {
        if (this.currentPolygon && this.currentPolygon.vertices.length > 0) {
            this.currentPolygon.completed = true;
            this.polygons.push(this.currentPolygon);
            this.selectedPolygonId = this.currentPolygon.id;
        }
        
        this.currentPolygon = new Polygon(this.polygonCounter++);
        this.updateSelectionInfo();
        this.updateUI();
        this.draw();
    }
    
    completePolygon() {
        if (this.currentPolygon && this.currentPolygon.vertices.length >= 3) {
            this.currentPolygon.completed = true;
            this.polygons.push(this.currentPolygon);
            this.selectedPolygonId = this.currentPolygon.id;
            this.currentPolygon = null;
        } else if (this.currentPolygon && this.currentPolygon.vertices.length < 3) {
            alert('Для завершения полигона нужно как минимум 3 точки!');
        }
        this.updateSelectionInfo();
        this.updateUI();
        this.draw();
    }
    
    deleteLast() {
        if (this.currentPolygon && this.currentPolygon.vertices.length > 0) {
            this.currentPolygon.vertices.pop();
            this.updateUI();
            this.draw();
        }
    }
    
    clearAll() {
        this.polygons = [];
        this.currentPolygon = null;
        this.checkMode = false;
        this.edgeCheckMode = false;
        this.selectMode = false;
        this.testPoint = null;
        this.highlightedPolygons = [];
        this.edgeCheckData = null;
        this.selectedPolygonId = -1;
        this.polygonCounter = 1;
        this.updateSelectionInfo();
        this.updateUI();
        this.draw();
    }
    
    checkPoint() {
        this.checkMode = !this.checkMode;
        this.edgeCheckMode = false;
        this.selectMode = false;
        this.testPoint = null;
        this.highlightedPolygons = [];
        this.edgeCheckData = null;
        this.updateUI();
        this.draw();
    }
    
    checkEdge() {
        this.edgeCheckMode = !this.edgeCheckMode;
        this.checkMode = false;
        this.selectMode = false;
        this.testPoint = null;
        this.highlightedPolygons = [];
        this.edgeCheckData = null;
        this.updateUI();
        this.draw();
    }
    
    selectPolygon() {
        this.selectMode = !this.selectMode;
        this.checkMode = false;
        this.edgeCheckMode = false;
        this.testPoint = null;
        this.highlightedPolygons = [];
        this.edgeCheckData = null;
        this.updateUI();
        this.draw();
    }
    
    translatePolygon() {
        const selectedPolygon = this.getSelectedPolygon();
        if (!selectedPolygon) {
            alert('Выберите полигон для преобразования!');
            return;
        }
        
        const dx = parseFloat(document.getElementById('dx').value) || 0;
        const dy = parseFloat(document.getElementById('dy').value) || 0;
        
        selectedPolygon.translate(dx, dy);
        this.draw();
    }
    
    rotatePolygon() {
        const selectedPolygon = this.getSelectedPolygon();
        if (!selectedPolygon) {
            alert('Выберите полигон для преобразования!');
            return;
        }
        
        const cx = parseFloat(document.getElementById('cx').value) || 0;
        const cy = parseFloat(document.getElementById('cy').value) || 0;
        const angle = parseFloat(document.getElementById('angle').value) || 0;
        
        selectedPolygon.rotateAroundPoint(cx, cy, angle);
        this.draw();
    }
    
    rotatePolygonAroundCenter() {
        const selectedPolygon = this.getSelectedPolygon();
        if (!selectedPolygon) {
            alert('Выберите полигон для преобразования!');
            return;
        }
        
        const angle = parseFloat(document.getElementById('angle-center').value) || 0;
        
        selectedPolygon.rotateAroundCenter(angle);
        this.draw();
    }
    
    getSelectedPolygon() {
        if (this.selectedPolygonId === -1) return null;
        
        let polygon = this.polygons.find(p => p.id === this.selectedPolygonId);
        
        if (!polygon && this.currentPolygon && this.currentPolygon.id === this.selectedPolygonId) {
            polygon = this.currentPolygon;
        }
        
        return polygon;
    }
    
    updateSelectionInfo() {
        const selectedPolygon = this.getSelectedPolygon();
        const infoElement = document.getElementById('selectedPolygonInfo');
        
        if (selectedPolygon) {
            const center = selectedPolygon.getCenter();
            infoElement.textContent = `Выбранный полигон: ID ${selectedPolygon.id} | Центр: (${center.x.toFixed(1)}, ${center.y.toFixed(1)}) | Вершин: ${selectedPolygon.vertices.length}`;
            infoElement.style.background = '#C8E6C9';
            infoElement.style.color = '#2E7D32';
        } else {
            infoElement.textContent = 'Выбранный полигон: нет';
            infoElement.style.background = '#FFEAA7';
            infoElement.style.color = '#333';
        }
    }
    
    draw() {
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.polygons.forEach(p => {
            const isSelected = p.id === this.selectedPolygonId;
            p.draw(this.ctx, this.highlightedPolygons.includes(p), 
                  this.edgeCheckData?.polygon === p ? this.edgeCheckData : null, isSelected);
        });
        
        if (this.currentPolygon) {
            const isSelected = this.currentPolygon.id === this.selectedPolygonId;
            this.currentPolygon.draw(this.ctx, false, null, isSelected);
        }
        
        if (this.testPoint) {
            this.ctx.fillStyle = '#FF0000';
            this.ctx.beginPath();
            this.ctx.arc(this.testPoint.x, this.testPoint.y, 6, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        if (this.selectMode) {
            this.ctx.fillStyle = '#333';
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Режим выбора: кликните на полигон для выбора', this.canvas.width / 2, 30);
            this.ctx.textAlign = 'left';
        }
    }
    
    updateUI() {
        document.getElementById('completePolygon').disabled = !this.currentPolygon;
        document.getElementById('deleteLast').disabled = !this.currentPolygon || this.currentPolygon.vertices.length === 0;
        
        const checkBtn = document.getElementById('checkPoint');
        const edgeBtn = document.getElementById('checkEdge');
        const selectBtn = document.getElementById('selectPolygon');
        
        checkBtn.style.background = this.checkMode ? '#B784A7' : 'transparent';
        checkBtn.style.color = this.checkMode ? 'white' : '#B784A7';
        edgeBtn.style.background = this.edgeCheckMode ? '#B784A7' : 'transparent';
        edgeBtn.style.color = this.edgeCheckMode ? 'white' : '#B784A7';
        selectBtn.style.background = this.selectMode ? '#4ECDC4' : 'transparent';
        selectBtn.style.color = this.selectMode ? 'white' : '#4ECDC4';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PolygonApp();
});