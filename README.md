# Vasco server
## 대구지방경찰청 수색 어플리케이션

### What we do?
실종자 수색을 위해 각 대원별 수색 현황, 지형별 특징 등을 기록하고 확인 할 수 있는 수색 어플리케이션을 제작하였습니다.
![바스코로드메인](https://user-images.githubusercontent.com/41224549/86869560-bf852400-c111-11ea-825d-3de35ef4447b.PNG)

### Why?
현재 산악지대에서의 실종자 수색 방식은 대원들이 일렬횡대로 시작 지점에 서서 한꺼번에 정상을 향하도록 진행하고 있습니다. 그러나 낭떠러지와 같이 길이 험하거나 뱀과 벌로 인해 사람이 지나가는 힘든 길이 있는 경우, 그 길을 피해서 매번 같은 길을 지나가게 되어 가까이 있어도 실종자를 찾지 못하는 경우가 많습니다. 따라서 수색지역에 대하여 인적 물적 자원 관리와 시간을 효율적으로 사용하여 빠르게 작업 진행률을 올리기 위해서 이 아이디어를 고안하게 되었습니다.

### How?
-- Android Application
- Android Application을 이용하여 실종자에 대한 정보들을 등록하고 대원들의 소속에 대한 정보를 설정한 후 실종자마다 수색 구역을 할당하여 방을 생성 할 수 있습니다. 방마다 수색을 진행 할 수 있으며 맵 전체에 히트맵 형식으로 수식 진행 상태에 대하여 표시를 할 수 있습니다.

![수색 진행](https://user-images.githubusercontent.com/41224549/86870388-438bdb80-c113-11ea-81ee-6d2813315073.PNG)


### Architecture
프로젝트 전체 구조는 다음과 같습니다.
![SystemArch](https://user-images.githubusercontent.com/41224549/86870486-70d88980-c113-11ea-894a-0079cad7b0c1.PNG)


# Server

## REST API

1. Uniform
2. Stateless
3. Cacheable
4. Self-descritiveness
    * URL을 통하여 무슨 CRUD Operation을 사용하고 싶은지 알 수 있음
5. Client-server architecture
    * 안드로이드 어플리케이션과 NodeJS 기반의 서버
6. Layered System
    * '/'를 이용한 리소스간의 계층 관계
7. Code on Demand

