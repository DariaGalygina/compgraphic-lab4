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
        this.edgeIntersectMode = false; // новый режим
        this.selectMode = false;
        this.testPoint = null;
        this.highlightedPolygons = [];
        this.edgeCheckData = null;
        this.selectedPolygonId = -1;
        this.polygonCounter = 1;

        // Для пересечения ребер:
        this.firstEdge = null; 
        this.secondEdge = null; 
        this.tempEdgeStart = null; // если пользователь рисует временное ребро мышью
        this.tempEdgeEnd = null;
        this.intersectionPoint = null; // {x,y} если есть
        
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
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        // кнопки
        const buttons = ['newPolygon', 'clearAll', 'completePolygon', 'deleteLast', 'checkPoint', 'checkEdge', 'selectPolygon', 'edgeIntersect'];
        buttons.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', () => this[id]());
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
            // сбрасываем пересечение
            this.firstEdge = this.secondEdge = this.tempEdgeStart = this.tempEdgeEnd = this.intersectionPoint = null;
        } else if (this.edgeCheckMode) {
            this.testPoint = pos;
            this.checkEdgeForPoint();
            // сбрасываем пересечение
            this.firstEdge = this.secondEdge = this.tempEdgeStart = this.tempEdgeEnd = this.intersectionPoint = null;
        } else if (this.selectMode) {
            this.selectPolygonAtPoint(pos);
            // сбрасываем пересечение
            this.firstEdge = this.secondEdge = this.tempEdgeStart = this.tempEdgeEnd = this.intersectionPoint = null;
        } else if (this.edgeIntersectMode) {
            // Логика выбора/рисования рёбер для пересечения
            this.handleEdgeIntersectClick(pos);
        } else {
            if (this.currentPolygon) {
                this.currentPolygon.vertices.push(pos);
            }
        }
        this.updateUI();
        this.draw();
    }
    
    handleMouseMove(e) {
        const pos = this.getMousePos(e);
        if (this.edgeIntersectMode) {
            // Если пользователь рисует временное ребро — обновляем temp end и пересечение
            if (this.tempEdgeStart && !this.secondEdge) {
                this.tempEdgeEnd = pos;
                this.intersectionPoint = this.computeIntersectionBetweenEdges(
                    this.firstEdge ? { start: this.firstEdge.start, end: this.firstEdge.end } : null,
                    { start: this.tempEdgeStart, end: this.tempEdgeEnd }
                );
                this.draw();
            } else if (this.firstEdge && !this.secondEdge && !this.tempEdgeStart) {
                // подсвечиваем ближайшее ребро под курсором (визуально) — поиск "второго" ребра динамически
                // но не меняем состояние; для простоты — при движении мы не выбираем автоматически
            }
        }
    }
    
    handleEdgeIntersectClick(pos) {
        const EDGE_PICK_EPS = 10;
    
        // Если ещё нет выбранного первого ребра
        if (!this.firstEdge) {
            const picked = this.findNearestEdge(pos, EDGE_PICK_EPS);
            if (picked) {
                // Выбрали существующее ребро как первое
                this.firstEdge = picked;
                this.intersectionPoint = null;
                return;
            }
    
            // Клик вне ребра:
            // Если временного старта ещё нет — начинаем рисовать временное ребро
            if (!this.tempEdgeStart) {
                this.tempEdgeStart = pos;
                // Инициализируем tempEdgeEnd, чтобы линия сразу рисовалась (и mousemove могла обновлять её)
                this.tempEdgeEnd = pos;
                this.intersectionPoint = null;
                return;
            }
    
            // Если tempEdgeStart уже был — второй клик завершает временное ребро
            if (this.tempEdgeStart) {
                this.tempEdgeEnd = pos;
                // Превращаем временное ребро в "первое ребро"
                this.firstEdge = { polygon: null, edgeIndex: null, start: this.tempEdgeStart, end: this.tempEdgeEnd };
                // Сбрасываем временные координаты (оставляем firstEdge для дальнейших действий)
                this.tempEdgeStart = null;
                this.tempEdgeEnd = null;
                this.intersectionPoint = null;
                return;
            }
        }
    
        // Если уже есть firstEdge — теперь выбираем/рисуем второе ребро
        if (this.firstEdge) {
            const pickedSecond = this.findNearestEdge(pos, EDGE_PICK_EPS);
            if (pickedSecond) {
                // Второе — существующее ребро
                this.secondEdge = pickedSecond;
                this.intersectionPoint = this.computeIntersectionBetweenEdges(
                    { start: this.firstEdge.start, end: this.firstEdge.end },
                    { start: this.secondEdge.start, end: this.secondEdge.end }
                );
                return;
            }
    
            // Клик вне ребра: начинаем/завершаем временное второе ребро
            if (!this.tempEdgeStart) {
                this.tempEdgeStart = pos;
                this.tempEdgeEnd = pos;
                return;
            } else {
                this.tempEdgeEnd = pos;
                this.secondEdge = { polygon: null, edgeIndex: null, start: this.tempEdgeStart, end: this.tempEdgeEnd };
                this.intersectionPoint = this.computeIntersectionBetweenEdges(
                    { start: this.firstEdge.start, end: this.firstEdge.end },
                    { start: this.secondEdge.start, end: this.secondEdge.end }
                );
                this.tempEdgeStart = null;
                this.tempEdgeEnd = null;
                return;
            }
        }
    }
    
    
    
    findNearestEdge(pos, maxDist = 10) {
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
                const denom = dx * dx + dy * dy;
                const t = denom === 0 ? 0 : ((pos.x - start.x) * dx + (pos.y - start.y) * dy) / denom;
                const closest = t < 0 ? start : t > 1 ? end : {
                    x: start.x + t * dx,
                    y: start.y + t * dy
                };
                const distance = Math.hypot(pos.x - closest.x, pos.y - closest.y);
                
                if (distance < minDistance && distance <= maxDist) {
                    minDistance = distance;
                    closestEdge = { polygon, edgeIndex: i, start: start, end: end };
                }
            }
        }
        
        return closestEdge;
    }
    
    computeIntersectionBetweenEdges(e1, e2) {
        // e1 и/или e2 могут быть null (ничего не вычисляем)
        if (!e1 || !e2) return null;
        const x1 = e1.start.x, y1 = e1.start.y;
        const x2 = e1.end.x,   y2 = e1.end.y;
        const x3 = e2.start.x, y3 = e2.start.y;
        const x4 = e2.end.x,   y4 = e2.end.y;
        
        // пересечение отрезков
        const denom = (y4 - y3)*(x2 - x1) - (x4 - x3)*(y2 - y1);

        if (Math.abs(denom) < 1e-9) {
            // параллельны или почти
            return null;
        }

        // вычисляем параметр t
        const ua = ((x4 - x3)*(y1 - y3) - (y4 - y3)*(x1 - x3)) / denom; 
        const ub = ((x2 - x1)*(y1 - y3) - (y2 - y1)*(x1 - x3)) / denom;

        // ua и ub — параметры на отрезках: 0..1 — пересечение внутри отрезков
        if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
            return null;
        }

        const ix = x1 + ua * (x2 - x1); // P(t) = a + t(b-a)
        const iy = y1 + ua * (y2 - y1);

        return { x: ix, y: iy };
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
        this.edgeIntersectMode = false;
        this.selectMode = false;
        this.testPoint = null;
        this.highlightedPolygons = [];
        this.edgeCheckData = null;
        this.selectedPolygonId = -1;
        this.polygonCounter = 1;
        this.firstEdge = this.secondEdge = this.tempEdgeStart = this.tempEdgeEnd = this.intersectionPoint = null;
        this.updateSelectionInfo();
        this.updateUI();
        this.draw();
    }
    
    checkPoint() {
        this.checkMode = !this.checkMode;
        this.edgeCheckMode = false;
        this.edgeIntersectMode = false;
        this.selectMode = false;
        this.testPoint = null;
        this.highlightedPolygons = [];
        this.edgeCheckData = null;
        this.firstEdge = this.secondEdge = this.tempEdgeStart = this.tempEdgeEnd = this.intersectionPoint = null;
        this.updateUI();
        this.draw();
    }
    
    checkEdge() {
        this.edgeCheckMode = !this.edgeCheckMode;
        this.checkMode = false;
        this.edgeIntersectMode = false;
        this.selectMode = false;
        this.testPoint = null;
        this.highlightedPolygons = [];
        this.edgeCheckData = null;
        this.firstEdge = this.secondEdge = this.tempEdgeStart = this.tempEdgeEnd = this.intersectionPoint = null;
        this.updateUI();
        this.draw();
    }
    
    edgeIntersect() {
        this.edgeIntersectMode = !this.edgeIntersectMode;
        // выключаем другие режимы
        if (this.edgeIntersectMode) {
            this.checkMode = false;
            this.edgeCheckMode = false;
            this.selectMode = false;
        } else {
            // при выходе из режима — сброс
            this.firstEdge = this.secondEdge = this.tempEdgeStart = this.tempEdgeEnd = this.intersectionPoint = null;
        }
        this.updateUI();
        this.draw();
    }
    
    selectPolygon() {
        this.selectMode = !this.selectMode;
        this.checkMode = false;
        this.edgeCheckMode = false;
        this.edgeIntersectMode = false;
        this.testPoint = null;
        this.highlightedPolygons = [];
        this.edgeCheckData = null;
        this.firstEdge = this.secondEdge = this.tempEdgeStart = this.tempEdgeEnd = this.intersectionPoint = null;
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
        
        // Рисуем выбор/временные элементы для режима пересечения рёбер
        if (this.edgeIntersectMode) {
            // подсказка
            this.ctx.fillStyle = '#333';
            this.ctx.font = '14px Arial';
            this.ctx.fillText('Режим пересечения рёбер: клик — выбрать/нарисовать ребро (1-е), затем клик — 2-е ребро', 10, 20);
            
            // Первое ребро
            if (this.firstEdge) {
                this.ctx.strokeStyle = '#FF8C00';
                this.ctx.lineWidth = 4;
                this.ctx.beginPath();
                this.ctx.moveTo(this.firstEdge.start.x, this.firstEdge.start.y);
                this.ctx.lineTo(this.firstEdge.end.x, this.firstEdge.end.y);
                this.ctx.stroke();
            }
            
            // Второе ребро (если выбрано существующее)
            if (this.secondEdge) {
                this.ctx.strokeStyle = '#00CED1';
                this.ctx.lineWidth = 4;
                this.ctx.beginPath();
                this.ctx.moveTo(this.secondEdge.start.x, this.secondEdge.start.y);
                this.ctx.lineTo(this.secondEdge.end.x, this.secondEdge.end.y);
                this.ctx.stroke();
            }
            
            // Временное ребро, если пользователь рисует его
            if (this.tempEdgeStart && this.tempEdgeEnd) {
                this.ctx.strokeStyle = '#888';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([5,5]);
                this.ctx.beginPath();
                this.ctx.moveTo(this.tempEdgeStart.x, this.tempEdgeStart.y);
                this.ctx.lineTo(this.tempEdgeEnd.x, this.tempEdgeEnd.y);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
            
            // Точка пересечения
            if (this.intersectionPoint) {
                this.ctx.fillStyle = '#800080'; // purple
                this.ctx.beginPath();
                this.ctx.arc(this.intersectionPoint.x, this.intersectionPoint.y, 6, 0, Math.PI * 2);
                this.ctx.fill();
                
                this.ctx.fillStyle = '#000';
                this.ctx.font = '12px Arial';
                const tx = Math.round(this.intersectionPoint.x);
                const ty = Math.round(this.intersectionPoint.y);
                this.ctx.fillText(`(${tx}, ${ty})`, this.intersectionPoint.x + 8, this.intersectionPoint.y - 8);
            }
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
        const intersectBtn = document.getElementById('edgeIntersect');
        
        checkBtn && (checkBtn.style.background = this.checkMode ? '#B784A7' : 'transparent');
        checkBtn && (checkBtn.style.color = this.checkMode ? 'white' : '#B784A7');
        edgeBtn && (edgeBtn.style.background = this.edgeCheckMode ? '#B784A7' : 'transparent');
        edgeBtn && (edgeBtn.style.color = this.edgeCheckMode ? 'white' : '#B784A7');
        selectBtn && (selectBtn.style.background = this.selectMode ? '#4ECDC4' : 'transparent');
        selectBtn && (selectBtn.style.color = this.selectMode ? 'white' : '#4ECDC4');
        intersectBtn && (intersectBtn.style.background = this.edgeIntersectMode ? '#6A5ACD' : 'transparent');
        intersectBtn && (intersectBtn.style.color = this.edgeIntersectMode ? 'white' : '#6A5ACD');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PolygonApp();
});
